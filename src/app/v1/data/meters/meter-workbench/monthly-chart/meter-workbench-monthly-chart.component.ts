import { Component, DestroyRef, ElementRef, Injector, ViewChild, afterRenderEffect, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { SavedVisualizationCommands } from '@data/account-workspace/saved-visualization-commands.service';
import type { VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import type { MeterResultsChartPresentation } from '@app/v1/shared/charts/metric-results-chart.models';
import { MeterResultsChartComponent } from '@app/v1/shared/charts/metric-results-chart/meter-results-chart.component';
import { VisualizationCaptureSession } from '@app/v1/visualizations/capture/visualization-capture-session';
import { VisualizationNavigationService } from '@app/v1/visualizations/visualization-navigation.service';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { MeterFiscalYearComparisonChartComponent } from './fiscal-year-comparison-chart/meter-fiscal-year-comparison-chart.component';
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
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly fragment = toSignal(inject(ActivatedRoute, { optional: true })?.fragment ?? of(null));
  private readonly navigation = inject(WorkspaceNavigationService);
  private readonly store = inject(AccountWorkspaceStore);
  private readonly journeys = inject(VisualizationNavigationService);
  private readonly injector = inject(Injector);
  private readonly destroy = inject(DestroyRef);
  @ViewChild(MeterResultsChartComponent) private chart?: MeterResultsChartComponent;
  @ViewChild(MeterFiscalYearComparisonChartComponent) private patternsChart?: MeterFiscalYearComparisonChartComponent;
  readonly captureKind = signal<'meter-monthly' | 'meter-monthly-patterns'>('meter-monthly');
  readonly hiddenPatternYears = signal<readonly number[]>([]);

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
  private readonly defaultPresentation = computed<MeterResultsChartPresentation>(() => ({ leftMetricId: this.defaultLeftMetricId(), rightMetricId: this.costMetric()?.id,
      leftDisplay: 'line', rightDisplay: 'line', leftTraceType: 'line', rightTraceType: 'line',
      hiddenMetricIds: [], zoom: { start: 0, end: 100 }, smoothLines: true, legend: true }));
  readonly captureSupport = computed(() => {
    const snapshot = this.store.snapshot(), facility = this.facility(), meter = this.meter(), projected = this.selectedCalendarizedMeter();
    if (!this.store.isReady() || this.store.hasPending() || this.workspace.calendarizationState() !== 'ready' || !snapshot || !facility || !meter || !projected)
      return { state: 'unsupported' as const, reasons: ['Wait for a ready monthly chart before saving a visualization.'] };
    return captureMonthlyMeter({ snapshot, facilityGuid: facility.guid, meterGuid: meter.guid, projectedMeter: projected,
      metrics: this.metrics(), rows: this.chartRows(), presentation: this.chartView() ?? this.defaultPresentation(),
      workspaceRevision: this.store.revision(), calendarDate: civilDate(new Date()) });
  });
  readonly visualizeAction = computed(() => {
    const support = this.captureSupport();
    return { disabled: support.state !== 'supported' || !!this.reviewed(), reason: support.state === 'unsupported' ? support.reasons.join(' ') : undefined };
  });
  readonly patternCaptureSupport = computed(() => {
    const snapshot = this.store.snapshot(), facility = this.facility(), meter = this.meter(), projected = this.selectedCalendarizedMeter();
    if (!this.store.isReady() || this.store.hasPending() || this.workspace.calendarizationState() !== 'ready' || !snapshot || !facility || !meter || !projected)
      return { state: 'unsupported' as const, reasons: ['Wait for a ready monthly chart before saving a visualization.'] };
    return captureMonthlyMeter({ snapshot, facilityGuid: facility.guid, meterGuid: meter.guid, projectedMeter: projected,
      metrics: this.metrics(), rows: this.chartRows(), presentation: { ...this.defaultPresentation(), smoothLines: false },
      patterns: { hiddenYears: this.hiddenPatternYears() }, workspaceRevision: this.store.revision(), calendarDate: civilDate(new Date()) });
  });
  readonly patternsVisualizeAction = computed(() => {
    const support = this.patternCaptureSupport();
    return { disabled: support.state !== 'supported' || !!this.reviewed(), reason: support.state === 'unsupported' ? support.reasons.join(' ') : undefined };
  });
  openPatternsCapture(): void {
    if (this.reviewed() || this.capture.needsProtection()) return;
    const support = this.patternCaptureSupport(); if (support.state !== 'supported') return;
    this.captureKind.set('meter-monthly-patterns'); this.capture.captureAnother(); this.captureError.set('');
    this.reviewed.set({ definition: support.definition, revision: this.store.revision() });
  }
  readonly reviewed = signal<{ definition: VisualizationDefinition; revision: number } | undefined>(undefined);
  readonly captureError = signal('');
  private readonly focusCaptureRequested = signal(false);
  readonly capture = new VisualizationCaptureSession(() => {
    const commands = this.injector.get(SavedVisualizationCommands), unsaved = this.injector.get(UnsavedChangesService);
    return { prepare: definition => commands.prepareCreate(definition, { kind: this.captureKind(), facilityGuid: this.facility()!.guid, meterGuid: this.meter()!.guid }), submit: command => commands.submit(command), recover: (accountGuid, guid) => commands.recover(accountGuid, guid),
      accountGuid: () => this.store.account()?.guid, ready: () => this.store.isReady(),
      open: (accountGuid, guid) => this.journeys.open(accountGuid, guid),
      registerProtection: (dirty, saving, refreshRequired, discard, preventLeave) => {
        const unregister = unsaved.register(dirty, discard, () => saving() || refreshRequired());
        const unregisterLeave = unsaved.registerNavigationPreflight(preventLeave), unregisterUnload = unsaved.protectBeforeUnload(dirty);
        return () => { unregister(); unregisterLeave(); unregisterUnload(); };
      } };
  });

  constructor() {
    this.destroy.onDestroy(() => this.capture.dispose());
    let anchor = '';
    afterRenderEffect(() => {
      const fragment = this.fragment(), key = JSON.stringify([this.account()?.guid, this.meter()?.guid, fragment]);
      if (!fragment || !['meter-monthly-chart', 'meter-fiscal-comparison-heading'].includes(fragment) || key === anchor || this.workspace.calendarizationState() !== 'ready') return;
      const target = this.host.querySelector<HTMLElement>(`[id="${fragment}"]`);
      if (target) { anchor = key; target.scrollIntoView?.({ block: 'start' }); target.focus({ preventScroll: true }); }
    });
    let owner = '';
    effect(() => {
      const key = JSON.stringify([this.account()?.guid, this.facility()?.guid, this.meter()?.guid]);
      if (key !== owner) { owner = key; untracked(() => { this.chartView.set(undefined); this.hiddenPatternYears.set([]); if (this.reviewed() && !this.capture.needsProtection()) this.closeCapture(); }); }
    });
    afterRenderEffect(() => {
      if (this.focusCaptureRequested() && !this.reviewed() && this.workspace.calendarizationState() === 'ready' && this.chart) {
        if (this.captureKind() === 'meter-monthly-patterns') this.patternsChart?.focusVisualize(); else this.chart.focusVisualize();
        this.focusCaptureRequested.set(false);
      }
    });
  }

  openCapture(view: MeterResultsChartPresentation): void {
    if (this.reviewed() || this.capture.needsProtection()) return;
    this.captureKind.set('meter-monthly'); this.chartView.set(view);
    const support = this.captureSupport();
    if (support.state !== 'supported') return;
    this.capture.captureAnother(); this.captureError.set('');
    this.reviewed.set({ definition: support.definition, revision: this.store.revision() });
  }

  async saveCapture(name: string): Promise<void> {
    if (this.capture.saving()) return;
    if (this.capture.refreshRequired()) { await this.capture.retry(); return; }
    const reviewed = this.reviewed(), support = this.captureKind() === 'meter-monthly-patterns' ? this.patternCaptureSupport() : this.captureSupport();
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
