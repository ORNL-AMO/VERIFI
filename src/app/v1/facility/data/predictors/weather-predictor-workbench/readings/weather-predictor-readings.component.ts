import { FocusMonitor } from '@angular/cdk/a11y';
import { Component, ElementRef, Injector, OnDestroy, ViewChild, afterNextRender, computed, effect, inject, signal, untracked } from '@angular/core';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { HasUnsavedChanges } from '@app/v1/account/data/unsaved-changes.guard';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';
import { CopyTableService } from '@shared/helper-services/copy-table.service';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { WeatherStation } from '@data/models/degreeDays';
import { WeatherMonth, WeatherMonthRange } from '@platform/weather/hourly-weather-data.models';
import { FacilityPredictorsWorkspaceService } from '../../facility-predictors-workspace.service';
import {
  WeatherStationMonthCalculationValue,
  WeatherStationMonthDraft,
  WeatherStationGroupPreview,
  WeatherStationReadingRow,
  buildWeatherStationMonthChangeSet,
  buildWeatherStationMonthDeleteChangeSet,
  buildWeatherStationReadingMatrix,
  buildWeatherStationStatusChecks,
  validateWeatherMonthRange,
  weatherFutureMonthCount,
  weatherRangeForReadings
} from '../../models';
import { PredictorWorkspaceActionsService } from '../../predictor-workspace-actions.service';
import { PredictorWeatherWorkflowService } from '../../predictor-weather-workflow.service';
import { WeatherReadingMonthEditorComponent } from './weather-reading-month-editor/weather-reading-month-editor.component';
import { WeatherSourceReadingsSlideoutComponent } from './weather-source-readings-slideout/weather-source-readings-slideout.component';

@Component({
  selector: 'app-weather-predictor-readings',
  templateUrl: './weather-predictor-readings.component.html',
  styleUrls: ['./weather-predictor-readings.component.css'],
  standalone: true,
  imports: [
    NgbPaginationModule,
    IconComponent,
    WorkspaceSlideoutComponent,
    WeatherReadingMonthEditorComponent,
    WeatherSourceReadingsSlideoutComponent
  ]
})
export class WeatherPredictorReadingsComponent implements HasUnsavedChanges, OnDestroy {
  private readonly actions = inject(PredictorWorkspaceActionsService);
  private readonly weatherWorkflow = inject(PredictorWeatherWorkflowService);
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
  readonly pageSize = signal(12);
  readonly rowFilter = signal<'all' | 'attention'>('all');
  readonly copyingTable = signal(false);
  readonly startMonth = signal('');
  readonly endMonth = signal('');
  readonly rangeDirty = signal(false);
  readonly rangePreview = signal<WeatherStationGroupPreview | undefined>(undefined);
  readonly rangeUpdateCompleted = signal(false);
  readonly updatingRange = signal(false);
  readonly rangeError = signal<string | undefined>(undefined);
  readonly selectedRange = computed(() => rangeFromInputs(this.startMonth(), this.endMonth()));
  readonly futureMonthCount = computed(() => {
    const range = this.selectedRange();
    return range ? weatherFutureMonthCount(range) : 0;
  });
  readonly filteredRows = computed(() => this.rowFilter() === 'attention'
    ? this.matrix().rows.filter(row => row.hasAttention)
    : this.matrix().rows);
  readonly maxPage = computed(() => Math.max(1, Math.ceil(this.filteredRows().length / this.pageSize())));
  readonly displayedRows = computed(() => {
    const start = (Math.min(this.currentPage(), this.maxPage()) - 1) * this.pageSize();
    return this.filteredRows().slice(start, start + this.pageSize());
  });
  readonly existingMonthKeys = computed(() => this.matrix().rows.map(row => row.key));
  readonly editor = signal<{ mode: 'add' | 'edit'; row?: WeatherStationReadingRow } | undefined>(undefined);
  readonly sourceReadings = signal<{
    predictor: IdbPredictor;
    row: WeatherStationReadingRow;
  } | undefined>(undefined);
  readonly deleteRow = signal<WeatherStationReadingRow | undefined>(undefined);
  readonly saving = signal(false);
  readonly actionError = signal<string | undefined>(undefined);
  readonly calculatedValues = signal<readonly WeatherStationMonthCalculationValue[]>([]);
  readonly calculating = signal(false);
  readonly calculationError = signal<string | undefined>(undefined);
  readonly canAct = computed(() => this.workspace.canWrite()
    && !this.workspace.hasPending() && !this.saving() && !this.updatingRange());
  readonly canUpdateRange = computed(() => {
    const group = this.workspace.selectedWeatherGroup();
    const range = this.selectedRange();
    return !!group?.stationId
      && !!range
      && !validateWeatherMonthRange(range)
      && this.canAct();
  });
  private calculationRequest = 0;
  private returnFocus?: HTMLElement;
  private paginationGroupKey?: string;
  private readonly unregisterUnsavedChanges = this.unsavedChanges.register(
    () => this.hasUnsavedChanges(), () => this.discardChanges(), () => this.isNavigationBlocked()
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
  private readonly synchronizeRange = effect(() => {
    const group = this.workspace.selectedWeatherGroup();
    const readings = this.workspace.selectedWeatherReadings();
    const range = weatherRangeForReadings(readings) ?? this.workspace.defaultWeatherRange();
    if (!group || this.rangeDirty() || this.rangePreview()) return;
    untracked(() => {
      this.startMonth.set(range ? toMonthInput(range.start) : '');
      this.endMonth.set(range ? toMonthInput(range.end) : '');
    });
  });
  @ViewChild(WeatherReadingMonthEditorComponent) private readonly monthEditor?: WeatherReadingMonthEditorComponent;
  @ViewChild('readingsRegion', { read: ElementRef }) private readonly readingsRegion?: ElementRef<HTMLElement>;
  @ViewChild('weatherReadingsTable', { read: ElementRef }) private readonly weatherReadingsTable?: ElementRef<HTMLTableElement>;

  ngOnDestroy(): void {
    this.resetCalculation();
    this.unregisterUnsavedChanges();
  }
  hasUnsavedChanges(): boolean { return this.rangeDirty() || !!this.monthEditor?.dirty(); }
  isNavigationBlocked(): boolean {
    return this.saving() || this.calculating() || this.updatingRange() || this.weatherWorkflow.busy();
  }

  setStartMonth(value: string): void {
    this.startMonth.set(value);
    this.markRangeChanged();
  }

  setEndMonth(value: string): void {
    this.endMonth.set(value);
    this.markRangeChanged();
  }

  async reviewRangeUpdate(event?: Event): Promise<void> {
    const group = this.workspace.selectedWeatherGroup();
    const range = this.selectedRange();
    if (!group?.stationId || !range || !this.canUpdateRange()) return;
    this.captureFocus(event);
    this.rangeError.set(undefined);
    this.rangeUpdateCompleted.set(false);
    this.updatingRange.set(true);
    try {
      const preview = await this.weatherWorkflow.previewStationGroup({
        sourceGroupKey: group.routeKey,
        station: { ID: group.stationId, name: group.stationName } as WeatherStation,
        range,
        definitions: group.predictors.map(predictor => ({
          predictorGuid: predictor.guid,
          weatherDataType: predictor.weatherDataType,
          name: predictor.name,
          baseTemperature: predictor.weatherDataType === 'HDD'
            ? predictor.heatingBaseTemperature
            : predictor.weatherDataType === 'CDD' ? predictor.coolingBaseTemperature : undefined,
          production: !!predictor.production
        }))
      }, group.predictors, this.workspace.selectedWeatherReadings());
      if (preview) this.rangePreview.set(preview);
      else this.rangeError.set(this.weatherWorkflow.state().error || 'The reading update could not be prepared.');
    } catch (error) {
      this.rangeError.set(error instanceof Error ? error.message : 'The reading update could not be prepared.');
    } finally {
      this.updatingRange.set(false);
    }
  }

  async confirmRangeUpdate(): Promise<void> {
    const preview = this.rangePreview();
    if (!preview || this.updatingRange()) return;
    this.rangeError.set(undefined);
    this.updatingRange.set(true);
    try {
      await this.weatherWorkflow.commitStationGroup(preview);
      this.rangeDirty.set(false);
      this.rangeUpdateCompleted.set(true);
    } catch (error) {
      this.rangeError.set(error instanceof Error ? error.message : 'The readings could not be updated.');
    } finally {
      this.updatingRange.set(false);
    }
  }

  closeRangeUpdate(): void {
    if (this.updatingRange()) return;
    const completed = this.rangeUpdateCompleted();
    this.rangePreview.set(undefined);
    this.rangeUpdateCompleted.set(false);
    this.rangeError.set(undefined);
    this.weatherWorkflow.reset();
    if (completed) this.rangeDirty.set(false);
    this.restoreFocus();
  }

  openAdd(event?: Event): void {
    if (this.canAct()) {
      this.captureFocus(event);
      this.actionError.set(undefined);
      this.resetCalculation();
      this.editor.set({ mode: 'add' });
    }
  }
  openEdit(row: WeatherStationReadingRow, event?: Event): void {
    if (this.canAct()) { this.captureFocus(event); this.actionError.set(undefined); this.editor.set({ mode: 'edit', row }); }
  }
  requestCloseEditor(): void {
    if (this.saving()) return;
    if (!this.monthEditor?.dirty()) this.closeEditor();
    else this.unsavedChanges.confirmDiscard();
  }
  requestDelete(row: WeatherStationReadingRow, event?: Event): void {
    if (this.canAct()) { this.captureFocus(event); this.deleteRow.set(row); this.actionError.set(undefined); }
  }
  openSourceReadings(row: WeatherStationReadingRow, predictorGuid: string, event?: Event): void {
    const predictor = this.workspace.selectedWeatherPredictors()
      .find(candidate => candidate.guid === predictorGuid);
    if (!predictor) return;
    this.captureFocus(event);
    this.sourceReadings.set({ predictor, row });
  }
  closeSourceReadings(): void {
    this.sourceReadings.set(undefined);
    this.restoreFocus();
  }

  async calculateMonth(month?: WeatherMonth): Promise<void> {
    const request = ++this.calculationRequest;
    this.calculatedValues.set([]);
    this.calculationError.set(undefined);
    if (!month) {
      if (this.calculating()) this.weatherWorkflow.cancel();
      this.calculating.set(false);
      return;
    }
    const group = this.workspace.selectedWeatherGroup();
    if (!group) return;
    this.calculating.set(true);
    const values = await this.weatherWorkflow.calculateStationMonth(group.predictors, month);
    if (request !== this.calculationRequest || this.editor()?.mode !== 'add') return;
    this.calculating.set(false);
    if (values) {
      this.calculatedValues.set(values);
    } else {
      this.calculationError.set(this.weatherWorkflow.state().error || 'Calculated weather values are unavailable for this month.');
    }
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
      this.closeEditor(true);
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

  setRowFilter(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.rowFilter.set(value === 'attention' ? 'attention' : 'all');
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
    this.resetCalculation();
    this.editor.set(undefined);
    this.actionError.set(undefined);
    this.restoreFocus();
  }
  private discardChanges(): void {
    this.closeEditor(true);
    this.rangePreview.set(undefined);
    this.rangeUpdateCompleted.set(false);
    this.rangeError.set(undefined);
    this.rangeDirty.set(false);
    this.weatherWorkflow.reset();
  }
  private markRangeChanged(): void {
    this.rangeDirty.set(true);
    this.rangePreview.set(undefined);
    this.rangeUpdateCompleted.set(false);
    this.rangeError.set(undefined);
    this.weatherWorkflow.reset();
  }
  private resetCalculation(): void {
    this.calculationRequest++;
    if (this.calculating()) this.weatherWorkflow.cancel();
    this.calculating.set(false);
    this.calculatedValues.set([]);
    this.calculationError.set(undefined);
    this.weatherWorkflow.reset();
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

function rangeFromInputs(start: string, end: string): WeatherMonthRange | undefined {
  const startMonth = parseMonthInput(start);
  const endMonth = parseMonthInput(end);
  return startMonth && endMonth ? { start: startMonth, end: endMonth } : undefined;
}

function parseMonthInput(value: string): WeatherMonth | undefined {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  return match ? { year: Number(match[1]), month: Number(match[2]) } : undefined;
}

function toMonthInput(month: WeatherMonth): string {
  return `${month.year}-${String(month.month).padStart(2, '0')}`;
}
