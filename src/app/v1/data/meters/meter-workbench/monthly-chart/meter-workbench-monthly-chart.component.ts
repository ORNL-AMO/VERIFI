import { Component, DestroyRef, ElementRef, Injector, ViewChild, afterRenderEffect, computed, effect, inject, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { SavedVisualizationCommands } from '@data/account-workspace/saved-visualization-commands.service';
import type { VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import type { MeterResultsChartPresentation } from '@app/v1/shared/charts/metric-results-chart.models';
import { MeterResultsChartComponent } from '@app/v1/shared/charts/metric-results-chart/meter-results-chart.component';
import { VisualizationCaptureSession } from '@app/v1/visualizations/capture/visualization-capture-session';
import { VisualizationNavigationService } from '@app/v1/visualizations/visualization-navigation.service';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { captureMonthlyMeter } from './monthly-meter-visualization-capture';
import { civilDate } from '@domain/visualizations/utility/utility-periods';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { FacilityMetersWorkspaceService } from '../../facility-meters-workspace.service';
import {
  MeterResultsChartMetric,
  buildMeterDataColumns,
  meterCalendarizationMethodLabel,
  meterDataChartMetrics,
  meterHasLifetimeCost,
  meterMonthlyChartRows,
  preferredMeterCostMetricId,
  preferredMeterUtilityMetricId
} from '../../models';

@Component({
  selector: 'app-meter-workbench-monthly-chart',
  templateUrl: './meter-workbench-monthly-chart.component.html',
  styleUrls: ['./meter-workbench-monthly-chart.component.css'],
  standalone: false
})
export class MeterWorkbenchMonthlyChartComponent {
  private readonly router = inject(Router);
  private readonly navigation = inject(WorkspaceNavigationService);
  private readonly store = inject(AccountWorkspaceStore);
  private readonly journeys = inject(VisualizationNavigationService);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly destroy = inject(DestroyRef);
  @ViewChild(MeterResultsChartComponent) private chart?: MeterResultsChartComponent;

  readonly workspace = inject(FacilityMetersWorkspaceService);
  readonly account = this.workspace.account;
  readonly meter = this.workspace.selectedMeter;
  readonly facility = this.workspace.facility;
  readonly selectedCalendarizedMeter = computed(() => {
    const selectedMeter = this.meter();
    return selectedMeter
      ? this.workspace.calendarizedMeters().find(calendarizedMeter => calendarizedMeter.meter.guid === selectedMeter.guid)
      : undefined;
  });
  readonly isRECs = computed(() => {
    const selectedMeter = this.meter();
    return selectedMeter?.source === 'Electricity' && (selectedMeter.agreementType === 4 || selectedMeter.agreementType === 6);
  });
  readonly consumptionLabel = computed(() => this.meter()?.scope === 2 ? 'Distance' : 'Consumption');
  readonly calendarizationMethodLabel = computed(() => meterCalendarizationMethodLabel(this.meter()?.meterReadingDataApplication));
  readonly monthlyRows = computed(() => this.selectedCalendarizedMeter()?.monthlyData ?? []);
  readonly columns = computed(() => buildMeterDataColumns(
    this.selectedCalendarizedMeter(),
    this.account(),
    this.isRECs(),
    this.consumptionLabel(),
    'monthly'
  ));
  readonly chartRows = computed(() => meterMonthlyChartRows(this.monthlyRows()));
  readonly metrics = computed(() => meterDataChartMetrics(this.columns()));
  readonly defaultLeftMetricId = computed(() => preferredMeterUtilityMetricId(this.columns()));
  readonly defaultRightMetricId = computed(() => preferredMeterCostMetricId(this.columns()));
  readonly utilityMetric = computed(() => metricById(this.metrics(), this.defaultLeftMetricId()));
  readonly costMetric = computed(() => meterHasLifetimeCost(this.monthlyRows())
    ? metricById(this.metrics(), this.defaultRightMetricId())
    : undefined);
  readonly fiscalYearStartMonth = computed(() => {
    const currentFacility = this.facility();
    return currentFacility?.fiscalYear === 'nonCalendarYear'
      ? currentFacility.fiscalYearMonth ?? 0
      : 0;
  });
  readonly usesFiscalYearLabels = computed(() => this.facility()?.fiscalYear === 'nonCalendarYear');
  readonly showFiscalYearComparison = computed(() => {
    const state = this.workspace.calendarizationState();
    return state !== 'loading'
      && state !== 'error'
      && this.monthlyRows().length > 0
      && !!this.utilityMetric();
  });

  readonly chartView = signal<MeterResultsChartPresentation | undefined>(undefined, { equal: (a, b) => JSON.stringify(a) === JSON.stringify(b) });
  private readonly chartIdentity = computed(() => JSON.stringify([this.account()?.guid, this.facility()?.guid, this.meter()?.guid]));
  readonly initialPresentation = computed<MeterResultsChartPresentation | undefined>(() => {
    const [accountGuid, facilityGuid, meterGuid] = JSON.parse(this.chartIdentity()) as (string | undefined)[];
    return accountGuid && facilityGuid && meterGuid ? this.journeys.monthlyMeterView(accountGuid, facilityGuid, meterGuid)?.presentation : undefined;
  });
  private readonly defaultPresentation = computed<MeterResultsChartPresentation>(() => ({ leftMetricId: this.defaultLeftMetricId(), rightMetricId: this.costMetric()?.id,
      leftDisplay: 'line', rightDisplay: 'line', leftTraceType: 'line', rightTraceType: 'line',
      hiddenMetricIds: [], zoom: { start: 0, end: 100 }, smoothLines: true, legend: true }));
  readonly captureSupport = computed(() => {
    const snapshot = this.store.snapshot(), facility = this.facility(), meter = this.meter(), projected = this.selectedCalendarizedMeter();
    if (!this.store.isReady() || this.store.hasPending() || this.workspace.calendarizationState() !== 'ready' || !snapshot || !facility || !meter || !projected)
      return { state: 'unsupported' as const, reasons: ['Wait for a ready monthly chart before saving a visualization.'] };
    return captureMonthlyMeter({ snapshot, facilityGuid: facility.guid, meterGuid: meter.guid, projectedMeter: projected,
      metrics: this.metrics(), rows: this.chartRows(), presentation: this.chartView() ?? this.initialPresentation() ?? this.defaultPresentation(),
      workspaceRevision: this.store.revision(), calendarDate: civilDate(new Date()) });
  });
  readonly visualizeAction = computed(() => {
    const support = this.captureSupport();
    return { disabled: support.state !== 'supported' || !!this.reviewed(), reason: support.state === 'unsupported' ? support.reasons.join(' ') : undefined };
  });
  readonly reviewed = signal<{ definition: VisualizationDefinition; revision: number; presentation: MeterResultsChartPresentation; scrollTop: number } | undefined>(undefined);
  readonly captureError = signal('');
  private readonly focusCaptureRequested = signal(false);
  readonly capture = new VisualizationCaptureSession(() => {
    const commands = this.injector.get(SavedVisualizationCommands), unsaved = this.injector.get(UnsavedChangesService);
    return { prepare: definition => commands.prepareCreate(definition), submit: command => commands.submit(command), recover: (accountGuid, guid) => commands.recover(accountGuid, guid),
      accountGuid: () => this.store.account()?.guid, ready: () => this.store.isReady(),
      open: (accountGuid, guid) => {
        const reviewed = this.reviewed();
        if (reviewed?.definition.facilitySelection.kind === 'fixed') {
          const source = reviewed.definition.sources[0];
          if (source.kind === 'utility' && source.selection?.kind === 'fixed') this.journeys.rememberMonthlyMeter(accountGuid, guid,
            { facilityGuid: reviewed.definition.facilitySelection.facilityGuids[0], meterGuid: source.selection.guids[0],
              presentation: reviewed.presentation, scrollTop: reviewed.scrollTop });
        }
        return this.journeys.open(accountGuid, guid);
      },
      registerProtection: (dirty, saving, refreshRequired, discard, preventLeave) => {
        const unregister = unsaved.register(dirty, discard, () => saving() || refreshRequired());
        const unregisterLeave = unsaved.registerNavigationPreflight(preventLeave), unregisterUnload = unsaved.protectBeforeUnload(dirty);
        return () => { unregister(); unregisterLeave(); unregisterUnload(); };
      } };
  });

  constructor() {
    this.destroy.onDestroy(() => this.capture.dispose());
    afterRenderEffect(() => {
      if (this.focusCaptureRequested() && !this.reviewed() && this.workspace.calendarizationState() === 'ready' && this.chart) {
        this.chart.focusVisualize(); this.focusCaptureRequested.set(false);
      }
    });
    let restoredKey = '';
    afterRenderEffect(() => {
      const account = this.account(), facility = this.facility(), meter = this.meter(), ready = this.workspace.calendarizationState() === 'ready';
      const key = JSON.stringify([account?.guid, facility?.guid, meter?.guid]);
      if (!ready || key === restoredKey || !account || !facility || !meter) return;
      const restored = this.journeys.monthlyMeterView(account.guid, facility.guid, meter.guid);
      if (restored && this.chart) {
        restoredKey = key;
        this.chart.focusVisualize(); this.scrollRoot().scrollTop = restored.scrollTop;
      }
    });
    let context = '';
    effect(() => {
      const key = JSON.stringify([this.account()?.guid, this.facility()?.guid, this.meter()?.guid]);
      if (key !== context) { context = key; untracked(() => { this.chartView.set(undefined); if (this.reviewed() && !this.capture.needsProtection()) this.closeCapture(); }); }
    });
  }

  openCapture(view: MeterResultsChartPresentation): void {
    if (this.reviewed() || this.capture.needsProtection()) return;
    this.chartView.set(view);
    const support = this.captureSupport();
    if (support.state !== 'supported') return;
    this.capture.captureAnother(); this.captureError.set('');
    this.reviewed.set({ definition: support.definition, revision: this.store.revision(), presentation: structuredClone(view), scrollTop: this.scrollRoot().scrollTop });
  }

  async saveCapture(name: string): Promise<void> {
    if (this.capture.saving()) return;
    if (this.capture.refreshRequired()) { await this.capture.retry(); return; }
    const reviewed = this.reviewed(), support = this.captureSupport();
    if (!reviewed || support.state !== 'supported' || reviewed.revision !== this.store.revision()
      || JSON.stringify(reviewed.definition) !== JSON.stringify(support.definition)) {
      this.captureError.set('The source chart changed during review. Close this panel and select Visualize again to review the current chart.'); return;
    }
    this.captureError.set('');
    if (this.capture.proposal()) await this.capture.retry();
    else if (name.trim()) await this.capture.start({ ...reviewed.definition, name: name.trim() });
  }

  closeCapture(): void {
    if (this.capture.saving() || this.capture.refreshRequired()) return;
    if (this.capture.proposal()) this.capture.discard();
    this.reviewed.set(undefined); this.captureError.set('');
    this.focusCaptureRequested.set(true);
  }

  private scrollRoot(): HTMLElement { return this.host.closest<HTMLElement>('.v1-workspace__main') ?? this.host; }

  openSettings(): void {
    const facility = this.facility();
    const meter = this.meter();
    if (facility && meter) {
      void this.router.navigate(this.navigation.facilityMeterRoute(facility.guid, meter.guid, 'settings'), { fragment: 'meter-reading-settings' });
    }
  }
}

function metricById(
  metrics: readonly MeterResultsChartMetric[],
  metricId: string | undefined
): MeterResultsChartMetric | undefined {
  return metricId ? metrics.find(metric => metric.id === metricId) : undefined;
}
