import { Component, DestroyRef, Injector, TemplateRef, ViewChild, ViewContainerRef, afterNextRender, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TemplatePortal } from '@angular/cdk/portal';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { MeterCommandHandler, MeterDeletionChanges } from '@data/account-workspace/handlers/meter-command-handler.service';
import { PredictorCommandHandler, PredictorDeletionPreview, predictorDeletionSnapshot } from '@data/account-workspace/handlers/predictor-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { isStandardPredictor } from '@data/models/idbModels/predictor';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { ConfirmationDialogComponent } from '@app/v1/shared/a11y/confirmation-dialog.component';
import { InventoryChartDockComponent } from '@app/v1/shared/charts/inventory-chart-dock/inventory-chart-dock.component';
import { InventoryChartSheetComponent } from '@app/v1/shared/charts/inventory-chart-sheet/inventory-chart-sheet.component';
import { DEFAULT_INVENTORY_CHART_VIEW } from '@app/v1/shared/charts/inventory-chart-sheet/inventory-chart-sheet.models';
import { buildInventoryMeterCharts, MeterChartGrouping } from '@app/v1/shared/charts/inventory-meter-charts/inventory-meter-charts';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { IDLE_WORKSPACE_CALENDARIZATION } from '@app/v1/shared/calendarization/workspace-calendarization.models';
import { buildPredictorCharts } from '@app/v1/facility/data/predictors/predictor-chart.view';
import { buildPredictorCards, buildWeatherStationGroups } from '@app/v1/facility/data/predictors/models';
import { buildPredictorInventory } from '@app/v1/facility/data/predictors/predictor-inventory/predictor-inventory.models';
import { InventoryToolsStateService } from './inventory-tools-state.service';
import { combinePredictorCharts } from '@app/v1/shared/charts/inventory-predictor-charts/inventory-predictor-charts';

interface DeletionReview { accountGuid: string; meters: readonly MeterDeletionChanges[]; predictors: readonly PredictorDeletionPreview[]; }
@Component({ selector: 'app-inventory-tools', standalone: true,
  imports: [ReactiveFormsModule, InventoryChartDockComponent, InventoryChartSheetComponent, ConfirmationDialogComponent],
  templateUrl: './inventory-tools.component.html', styleUrls: ['./inventory-tools.component.css'] })
export class InventoryToolsComponent {
  readonly resource = input.required<'meters' | 'predictors'>();
  readonly showSelectionToggle = input(true);
  readonly matchingGuids = input.required<readonly string[]>();
  readonly scopeGuids = input.required<readonly string[]>();
  readonly filtersKey = input('');
  readonly workspace = inject(AccountWorkspaceStore);
  readonly navigation = inject(WorkspaceNavigationService);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly portal = inject(ModalPortalService);
  private readonly container = inject(ViewContainerRef);
  private readonly memory = inject(InventoryToolsStateService);
  @ViewChild('chartPanel') private chartPanel!: TemplateRef<unknown>;
  @ViewChild('confirmation') private confirmation!: TemplateRef<unknown>;
  private activePortal: TemplatePortal<unknown> | undefined;
  private opener: HTMLElement | null = null;
  readonly chartsOpen = signal(false);
  readonly selecting = signal(false);
  readonly selected = signal<readonly string[]>([]);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly review = signal<DeletionReview | undefined>(undefined);
  readonly grouping = signal<MeterChartGrouping>('groups');
  readonly multiplePredictors = signal(false);
  readonly view = signal({ ...DEFAULT_INVENTORY_CHART_VIEW });
  readonly zoom = signal({ start: 0, end: 100 });
  readonly form = new FormGroup({ grouping: new FormControl<MeterChartGrouping>('groups', { nonNullable: true }), multiplePredictors: new FormControl(false, { nonNullable: true }) });
  readonly contextKey = computed(() => JSON.stringify([this.workspace.account()?.guid, this.resource(), this.navigation.inventoryFacilityGuid()]));
  readonly facility = computed(() => this.workspace.facilities().find(f => f.guid === this.navigation.inventoryFacilityGuid()));
  readonly settings = computed(() => this.facility() ?? this.workspace.account());
  readonly contextLabel = computed(() => this.facility()?.name || 'All facilities');
  readonly canAct = computed(() => this.workspace.canWrite() && !this.workspace.hasPending() && !this.saving());
  readonly selectable = computed(() => Object.fromEntries(this.scopeGuids().map(guid => [guid, this.resource() === 'meters' || this.workspace.predictors().some(p => p.guid === guid && (isStandardPredictor(p) || p.predictorType === 'Weather'))])));
  readonly sourceIds = computed(() => this.matchingGuids());
  private readonly base = toSignal(toObservable(computed(() => this.chartsOpen() && this.resource() === 'meters')).pipe(switchMap(active => active ? this.injector.get(WorkspaceCalendarizationService).calendarizeBase() : of(IDLE_WORKSPACE_CALENDARIZATION))), { initialValue: IDLE_WORKSPACE_CALENDARIZATION });
  private readonly projection = computed(() => {
    const base = this.base(), account = this.workspace.account(), settings = this.settings();
    if (base.state !== 'ready' || !account || !settings || this.resource() !== 'meters') return undefined;
    return this.injector.get(WorkspaceCalendarizationService).project(base, { context: this.facility() ? { kind: 'facility', guid: this.facility()!.guid } : { kind: 'account', guid: account.guid }, meterGuids: this.sourceIds(), energyUnit: settings.energyUnit, waterUnit: settings.volumeLiquidUnit, energyIsSource: settings.energyIsSource, includeEmissions: false });
  });
  readonly chartState = computed(() => this.workspace.status() === 'error' ? 'error' : !this.workspace.canWrite() ? 'loading' : this.resource() === 'predictors' ? 'ready' : this.projection()?.state === 'error' || this.base().state === 'error' ? 'error' : this.base().state === 'ready' ? 'ready' : 'loading');
  readonly predictorCharts = computed(() => {
    if (!this.chartsOpen() || this.resource() !== 'predictors') return [];
    const ids = new Set(this.sourceIds());
    const entries = this.workspace.facilities().flatMap(f => {
      const predictors = this.workspace.predictors().filter(p => p.facilityId === f.guid && ids.has(p.guid));
      const readings = this.workspace.predictorData().filter(r => r.facilityId === f.guid);
      return buildPredictorInventory(buildPredictorCards(predictors, readings, [], true), buildWeatherStationGroups(predictors, readings, [], true), f, 'ready');
    });
    return buildPredictorCharts(entries, this.workspace.predictorData()).map(chart => {
      const entry = entries.find(e => e.guid === chart.id)!;
      return { ...chart, title: `${entry.facility.name} / ${chart.title}`, metrics: [{ ...chart.metrics[0], id: chart.id, label: `${entry.facility.name} / ${chart.title}`, shortLabel: chart.title, unit: chart.unit || undefined, facilityGuid: entry.facility.guid, facilityName: entry.facility.name, kind: 'predictor' as const }] };
    });
  });
  readonly charts = computed(() => {
    if (!this.chartsOpen()) return [];
    if (this.resource() === 'meters') return buildInventoryMeterCharts(this.projection()?.meters ?? [], this.workspace.facilities(), this.workspace.meterGroups(), this.grouping(), this.settings()?.energyUnit ?? '', this.settings()?.volumeLiquidUnit ?? '');
    return this.multiplePredictors() ? combinePredictorCharts(this.predictorCharts()) : this.predictorCharts();
  });
  readonly reviewGroups = computed(() => {
    const review = this.review(); if (!review) return [];
    return this.workspace.facilities().flatMap(f => {
      const meters = review.meters.filter(item => item.meter.facilityId === f.guid), predictors = review.predictors.find(p => p.facilityGuid === f.guid);
      const count = meters.length + (predictors?.predictors.length ?? 0);
      return count ? [{ guid: f.guid, name: f.name, count, readings: meters.reduce((n,m) => n + m.meterData.length, 0) + (predictors?.predictorData.length ?? 0), analyses: predictors?.facilityAnalyses.length ?? 0 }] : [];
    });
  });
  constructor() {
    let previous = '', previousFilters = '';
    const save = () => { if (previous) this.memory.save(previous, { grouping: this.grouping(), multiplePredictors: this.multiplePredictors(), view: this.view(), zoom: this.zoom() }); };
    effect(() => {
      const key = this.contextKey(), filters = this.filtersKey();
      untracked(() => {
        if (key !== previous) {
          save(); previous = key; const saved = this.memory.read(key);
          this.grouping.set(saved?.grouping ?? 'groups'); this.multiplePredictors.set(saved?.multiplePredictors ?? false);
          this.view.set(saved?.view ?? { ...DEFAULT_INVENTORY_CHART_VIEW }); this.zoom.set(saved?.zoom ?? { start: 0, end: 100 });
          this.form.patchValue({ grouping: this.grouping(), multiplePredictors: this.multiplePredictors() }, { emitEvent: false });
          this.clearSelection();
        } else if (previousFilters !== filters) this.clearSelection();
        previousFilters = filters;
      });
    });
    effect(() => {
      const active = this.portal.activePortal();
      untracked(() => {
        if (this.activePortal && active !== this.activePortal) {
          this.activePortal = undefined;
          this.chartsOpen.set(false);
          this.review.set(undefined);
        }
      });
    });
    const subscription = this.form.valueChanges.subscribe(() => {
      const value = this.form.getRawValue();
      if (value.grouping !== this.grouping()) this.view.set({ ...this.view(), hiddenGuids: [], legendPage: 0 });
      if (value.multiplePredictors !== this.multiplePredictors()) this.zoom.set({ start: 0, end: 100 });
      this.grouping.set(value.grouping); this.multiplePredictors.set(value.multiplePredictors);
    });
    const unregister = inject(UnsavedChangesService).register(() => false, () => {}, () => this.saving() || !!this.review());
    this.destroyRef.onDestroy(() => { save(); subscription.unsubscribe(); unregister(); this.hidePortal(); });
    effect(() => { const existing = new Set(this.scopeGuids()); untracked(() => this.selected.update(ids => ids.filter(id => existing.has(id)))); });
  }
  private showPortal(template: TemplateRef<unknown>): void {
    this.opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.activePortal = new TemplatePortal(template, this.container);
    this.portal.show(this.activePortal, { blockWorkspace: template === this.chartPanel });
  }
  private hidePortal(): void {
    if (this.activePortal && this.portal.activePortal() === this.activePortal) {
      this.portal.hide();
      const opener = this.opener;
      if (opener?.isConnected && !this.destroyRef.destroyed) {
        afterNextRender(() => { if (opener.isConnected) opener.focus(); }, { injector: this.injector });
      }
    }
    this.activePortal = undefined;
  }
  openCharts(): void { if (!this.chartsOpen()) { this.chartsOpen.set(true); this.showPortal(this.chartPanel); } }
  closeCharts(): void { this.chartsOpen.set(false); this.hidePortal(); }
  toggleSelection(): void {
    if (!this.canAct()) return;
    if (this.selecting()) this.clearSelection();
    else if (this.matchingGuids().length) this.selecting.set(true);
  }
  clearSelection(): void {
    this.selected.set([]); this.selecting.set(false);
  }
  select(change: { guid: string; selected: boolean }): void {
    if (!this.canAct() || !this.selectable()[change.guid]) return;
    this.selected.update(ids => change.selected ? [...new Set([...ids, change.guid])] : ids.filter(id => id !== change.guid));
  }
  selectAll(): void { if (this.canAct()) this.selected.set(this.matchingGuids().filter(id => this.selectable()[id])); }
  private snapshot(): DeletionReview {
    const accountGuid = this.workspace.account()!.guid, ids = new Set(this.selected());
    if (this.resource() === 'meters') return structuredClone({ accountGuid, meters: this.workspace.meters().filter(m => ids.has(m.guid)).map(meter => ({ meter, meterData: this.workspace.meterData().filter(r => r.meterId === meter.guid) })), predictors: [] });
    return structuredClone({ accountGuid, meters: [], predictors: this.workspace.facilities().flatMap(f => {
      const predictors = this.workspace.predictors().filter(p => p.facilityId === f.guid && ids.has(p.guid));
      return predictors.length ? [{ facilityGuid: f.guid, predictors, predictorData: this.workspace.predictorData().filter(r => predictors.some(p => p.guid === r.predictorId)), facilityAnalyses: this.workspace.facilityAnalyses().filter(a => a.facilityId === f.guid) }] : [];
    }) });
  }
  requestDelete(): void {
    if (!this.canAct() || !this.selected().length) return;
    this.error.set(''); this.chartsOpen.set(false); this.review.set(this.snapshot()); this.showPortal(this.confirmation);
  }
  cancelDelete(): void { if (!this.saving()) { this.review.set(undefined); this.hidePortal(); } }
  async confirmDelete(): Promise<void> {
    const reviewed = this.review(); if (!reviewed || !this.canAct()) return;
    if (predictorDeletionSnapshot(reviewed) !== predictorDeletionSnapshot(this.snapshot())) { this.error.set('The selected records changed. Review the deletion again.'); this.cancelDelete(); return; }
    this.saving.set(true);
    try {
      await this.injector.get(WorkspaceCommandBoundary).execute({ entityKind: this.resource() === 'meters' ? 'meter' : 'predictor', changeKind: 'bulk', entityGuid: reviewed.accountGuid, label: `Deleting ${this.resource()}`, publication: { mode: 'reload' } }, () => this.resource() === 'meters'
        ? this.injector.get(MeterCommandHandler).deleteMetersAcrossFacilities(reviewed.meters, reviewed.accountGuid)
        : this.injector.get(PredictorCommandHandler).deletePredictorsAcrossFacilities(reviewed.predictors, reviewed.accountGuid));
      this.review.set(undefined); this.hidePortal(); this.clearSelection();
    } catch (error) { this.error.set(error instanceof Error ? error.message : 'The deletion failed. No records were deleted.'); }
    finally { this.saving.set(false); }
  }
}
