import { FocusMonitor } from '@angular/cdk/a11y';
import { Component, ElementRef, Injector, OnDestroy, ViewChild, afterNextRender, computed, effect, inject, signal } from '@angular/core';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { HasUnsavedChanges } from '@app/v1/account/data/unsaved-changes.guard';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';
import { CopyTableService } from '@shared/helper-services/copy-table.service';
import { FacilityPredictorsWorkspaceService } from '../../facility-predictors-workspace.service';
import {
  WeatherStationMonthDraft,
  WeatherStationReadingRow,
  buildWeatherStationMonthChangeSet,
  buildWeatherStationMonthDeleteChangeSet,
  buildWeatherStationReadingMatrix,
  buildWeatherStationStatusChecks
} from '../../models';
import { PredictorWorkspaceActionsService } from '../../predictor-workspace-actions.service';
import { WeatherReadingMonthEditorComponent } from './weather-reading-month-editor/weather-reading-month-editor.component';

@Component({
  selector: 'app-weather-predictor-readings',
  templateUrl: './weather-predictor-readings.component.html',
  styleUrls: ['./weather-predictor-readings.component.css'],
  standalone: true,
  imports: [NgbPaginationModule, IconComponent, WorkspaceSlideoutComponent, WeatherReadingMonthEditorComponent]
})
export class WeatherPredictorReadingsComponent implements HasUnsavedChanges, OnDestroy {
  private readonly actions = inject(PredictorWorkspaceActionsService);
  private readonly copyTableService = inject(CopyTableService);
  private readonly unsavedChanges = inject(UnsavedChangesService);
  private readonly focusMonitor = inject(FocusMonitor);
  private readonly injector = inject(Injector);
  readonly workspace = inject(FacilityPredictorsWorkspaceService);
  readonly matrix = computed(() => buildWeatherStationReadingMatrix(
    this.workspace.selectedWeatherPredictors(), this.workspace.selectedWeatherReadings()
  ));
  readonly readingChecks = computed(() => {
    const group = this.workspace.selectedWeatherGroup();
    return group
      ? buildWeatherStationStatusChecks(group.predictors, group.statusFindings ?? [])
        .filter(check => check.section === 'readings')
      : [];
  });
  readonly readingCheckCount = computed(() => this.readingChecks()
    .reduce((total, check) => total + check.findingCount, 0));
  readonly affectedPredictorCount = computed(() => new Set(
    this.readingChecks().flatMap(check => check.predictorGuids)
  ).size);
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly copyingTable = signal(false);
  readonly maxPage = computed(() => Math.max(1, Math.ceil(this.matrix().rows.length / this.pageSize())));
  readonly displayedRows = computed(() => {
    const start = (Math.min(this.currentPage(), this.maxPage()) - 1) * this.pageSize();
    return this.matrix().rows.slice(start, start + this.pageSize());
  });
  readonly existingMonthKeys = computed(() => this.matrix().rows.map(row => row.key));
  readonly editor = signal<{ mode: 'add' | 'edit'; row?: WeatherStationReadingRow } | undefined>(undefined);
  readonly deleteRow = signal<WeatherStationReadingRow | undefined>(undefined);
  readonly saving = signal(false);
  readonly actionError = signal<string | undefined>(undefined);
  readonly canAct = computed(() => this.workspace.canWrite() && !this.workspace.hasPending() && !this.saving());
  private returnFocus?: HTMLElement;
  private paginationGroupKey?: string;
  private readonly unregisterUnsavedChanges = this.unsavedChanges.register(
    () => this.hasUnsavedChanges(), () => this.closeEditor(true), () => this.isNavigationBlocked()
  );
  private readonly clampCurrentPage = effect(() => {
    const groupKey = this.workspace.selectedWeatherGroup()?.routeKey;
    const maxPage = this.maxPage();
    if (groupKey !== this.paginationGroupKey) {
      this.paginationGroupKey = groupKey;
      this.currentPage.set(1);
    } else if (this.currentPage() > maxPage) {
      this.currentPage.set(maxPage);
    }
  });
  @ViewChild(WeatherReadingMonthEditorComponent) private readonly monthEditor?: WeatherReadingMonthEditorComponent;
  @ViewChild('readingsRegion', { read: ElementRef }) private readonly readingsRegion?: ElementRef<HTMLElement>;
  @ViewChild('weatherReadingsTable', { read: ElementRef }) private readonly weatherReadingsTable?: ElementRef<HTMLTableElement>;

  ngOnDestroy(): void { this.unregisterUnsavedChanges(); }
  hasUnsavedChanges(): boolean { return !!this.monthEditor?.dirty(); }
  isNavigationBlocked(): boolean { return this.saving(); }

  openAdd(event?: Event): void { if (this.canAct()) { this.captureFocus(event); this.actionError.set(undefined); this.editor.set({ mode: 'add' }); } }
  openEdit(row: WeatherStationReadingRow, event?: Event): void {
    if (this.canAct()) { this.captureFocus(event); this.actionError.set(undefined); this.editor.set({ mode: 'edit', row }); }
  }
  requestCloseEditor(): void {
    if (this.saving()) return;
    if (!this.hasUnsavedChanges()) this.closeEditor();
    else this.unsavedChanges.confirmDiscard();
  }
  requestDelete(row: WeatherStationReadingRow, event?: Event): void {
    if (this.canAct()) { this.captureFocus(event); this.deleteRow.set(row); this.actionError.set(undefined); }
  }

  async saveMonth(draft: WeatherStationMonthDraft): Promise<void> {
    const panel = this.editor();
    const group = this.workspace.selectedWeatherGroup();
    if (!panel || !group || !this.canAct()) return;
    try {
      const changes = buildWeatherStationMonthChangeSet(
        panel.mode, group.routeKey, group.predictors, this.workspace.selectedWeatherReadings(), draft, this.workspace.revision()
      );
      this.saving.set(true);
      await this.actions.applyWeatherStationMonth(changes);
      this.closeEditor();
    } catch (error) {
      this.actionError.set(error instanceof Error ? error.message : 'The station month could not be saved.');
    } finally { this.saving.set(false); }
  }

  async confirmDelete(): Promise<void> {
    const row = this.deleteRow();
    const group = this.workspace.selectedWeatherGroup();
    if (!row || !group || !this.canAct()) return;
    try {
      this.saving.set(true);
      await this.actions.applyWeatherStationMonth(buildWeatherStationMonthDeleteChangeSet(
        group.routeKey, group.predictors, this.workspace.selectedWeatherReadings(), row.year, row.month, this.workspace.revision()
      ));
      this.deleteRow.set(undefined);
      this.restoreFocus();
    } catch (error) {
      this.actionError.set(error instanceof Error ? error.message : 'The station month could not be deleted.');
    } finally { this.saving.set(false); }
  }

  cancelDelete(): void { if (!this.saving()) { this.deleteRow.set(undefined); this.restoreFocus(); } }
  rowHasDuplicates(row: WeatherStationReadingRow): boolean { return row.cells.some(cell => cell.duplicate); }

  setPageSize(event: Event): void {
    this.pageSize.set(Number((event.target as HTMLSelectElement).value));
    this.currentPage.set(1);
  }

  copyTable(): void {
    if (!this.weatherReadingsTable) return;
    this.copyingTable.set(true);
    setTimeout(() => {
      this.copyTableService.copyTable(this.weatherReadingsTable);
      this.copyingTable.set(false);
    }, 200);
  }

  private closeEditor(force = false): void {
    if (!force && this.saving()) return;
    this.editor.set(undefined);
    this.actionError.set(undefined);
    this.restoreFocus();
  }
  private captureFocus(event?: Event): void { this.returnFocus = event?.currentTarget as HTMLElement | undefined; }
  private restoreFocus(): void {
    afterNextRender(() => {
      const target = this.returnFocus?.isConnected ? this.returnFocus : this.readingsRegion?.nativeElement;
      if (target) this.focusMonitor.focusVia(target, 'program');
      this.returnFocus = undefined;
    }, { injector: this.injector });
  }
}
