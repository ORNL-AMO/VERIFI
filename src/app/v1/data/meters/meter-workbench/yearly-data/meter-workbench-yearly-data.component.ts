import { FormControl } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { SavedVisualizationCommands } from '@data/account-workspace/saved-visualization-commands.service';
import type { VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import type { MeterResultsChartPresentation, MeterResultsChartRow } from '@app/v1/shared/charts/metric-results-chart.models';
import { MeterResultsChartComponent } from '@app/v1/shared/charts/metric-results-chart/meter-results-chart.component';
import { VisualizationCaptureSession } from '@app/v1/visualizations/capture/visualization-capture-session';
import { VisualizationNavigationService } from '@app/v1/visualizations/visualization-navigation.service';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { civilDate } from '@domain/visualizations/utility/utility-periods';
import { captureMonthlyMeter } from '../monthly-chart/monthly-meter-visualization-capture';
import { yearlyMeterData } from './yearly-meter-data';
import { Component, DestroyRef, ElementRef, Injector, ViewChild, afterRenderEffect, computed, effect, inject, signal, untracked } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CopyTableService } from '@shared/helper-services/copy-table.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { FacilityMetersWorkspaceService } from '../../facility-meters-workspace.service';
import {
  MeterDataColumn,
  MeterYearlyDataColumnId,
  buildMeterDataColumns,
  buildMeterYearlyDataRows,
  meterCalendarizationMethodLabel,
  meterDataChartMetrics,
  meterHasLifetimeCost,
  meterWorkbenchTab,
  preferredMeterCostMetricId,
  preferredMeterUtilityMetricId
} from '../../models';

type YearlyDataSortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-meter-workbench-yearly-data',
  templateUrl: './meter-workbench-yearly-data.component.html',
  styleUrls: ['./meter-workbench-yearly-data.component.css'],
  standalone: false
})
export class MeterWorkbenchYearlyDataComponent {
  private readonly store = inject(AccountWorkspaceStore);
  private readonly injector = inject(Injector);
  private readonly destroy = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly fragment = toSignal(this.route?.fragment ?? of(null));
  private readonly params = toSignal(this.route?.queryParamMap ?? of(null));
  readonly yearToDate = new FormControl(false, { nonNullable: true });
  readonly ytd = toSignal(this.yearToDate.valueChanges, { initialValue: false });
  @ViewChild(MeterResultsChartComponent) private chart?: MeterResultsChartComponent;
  private readonly copyTableService = inject(CopyTableService);
  private readonly router = inject(Router);
  private readonly navigation = inject(WorkspaceNavigationService);

  readonly tab = meterWorkbenchTab('yearly');
  readonly workspace = inject(FacilityMetersWorkspaceService);
  readonly account = this.workspace.account;
  readonly meter = this.workspace.selectedMeter;
  readonly facility = this.workspace.facility;
  readonly copyingTable = signal(false);
  readonly sortColumn = signal<MeterYearlyDataColumnId>('year');
  readonly sortDirection = signal<YearlyDataSortDirection>('desc');
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
  readonly rows = computed(() => buildMeterYearlyDataRows(this.selectedCalendarizedMeter()?.monthlyData ?? []));
  readonly hasLifetimeCost = computed(() => meterHasLifetimeCost(this.rows()));
  readonly columns = computed(() => (buildMeterDataColumns(
    this.selectedCalendarizedMeter(),
    this.account(),
    this.isRECs(),
    this.consumptionLabel(),
    'yearly'
  ) as Array<MeterDataColumn<MeterYearlyDataColumnId>>)
    .filter(column => column.id !== 'energyCost' || this.hasLifetimeCost()));
  readonly yearlyData = computed(() => yearlyMeterData(this.store.snapshot(), this.selectedCalendarizedMeter(), this.facility(), this.metrics(), this.ytd()));
  readonly chartRows = computed(() => this.yearlyData().rows);
  readonly sortedRows = computed(() => [...this.chartRows()].sort((first, second) => {
    const column = this.sortColumn();
    const result = column === 'year' ? Number(first.periodKey) - Number(second.periodKey) : Number(first.values[column] ?? 0) - Number(second.values[column] ?? 0);
    return this.sortDirection() === 'asc' ? result : -result;
  }));
  readonly contextLabel = computed(() => this.ytd() ? this.yearlyData().context?.label ?? 'No eligible saved month is available for Year to Date.' : 'Full year');
  readonly metrics = computed(() => meterDataChartMetrics(this.columns()));
  readonly defaultLeftMetricId = computed(() => preferredMeterUtilityMetricId(this.columns()));
  readonly defaultRightMetricId = computed(() => preferredMeterCostMetricId(this.columns()));

  readonly chartView = signal<MeterResultsChartPresentation | undefined>(undefined, { equal: (a, b) => JSON.stringify(a) === JSON.stringify(b) });
  readonly captureSupport = computed(() => {
    const snapshot = this.store.snapshot(), facility = this.facility(), meter = this.meter(), projected = this.selectedCalendarizedMeter();
    if (!this.store.isReady() || this.store.hasPending() || this.workspace.calendarizationState() !== 'ready' || !snapshot || !facility || !meter || !projected)
      return { state: 'unsupported' as const, reasons: ['Wait for a ready yearly chart before saving a visualization.'] };
    const right = this.chartRows().reduce((sum, row) => sum + (row.values['energyCost'] ?? 0), 0) !== 0 ? this.defaultRightMetricId() : undefined;
    return captureMonthlyMeter({ snapshot, facilityGuid: facility.guid, meterGuid: meter.guid, projectedMeter: projected, metrics: this.metrics(), rows: this.chartRows(),
      presentation: this.chartView() ?? { leftMetricId: this.defaultLeftMetricId(), rightMetricId: right, leftDisplay: 'line', rightDisplay: 'line', leftTraceType: 'line', rightTraceType: 'line', hiddenMetricIds: [], zoom: { start: 0, end: 100 }, smoothLines: true, legend: true },
      workspaceRevision: this.store.revision(), calendarDate: civilDate(new Date()), yearly: { yearToDate: this.ytd(), latestDataDate: this.yearlyData().anchor, observations: this.yearlyData().observations } });
  });
  readonly visualizeAction = computed(() => { const support = this.captureSupport(); return { disabled: support.state !== 'supported' || !!this.reviewed(), reason: support.state === 'unsupported' ? support.reasons.join(' ') : undefined }; });
  readonly reviewed = signal<{ definition: VisualizationDefinition; revision: number } | undefined>(undefined);
  readonly captureError = signal('');
  private readonly focusCaptureRequested = signal(false);
  readonly capture = new VisualizationCaptureSession(() => {
    const commands = this.injector.get(SavedVisualizationCommands), unsaved = this.injector.get(UnsavedChangesService);
    return { prepare: definition => commands.prepareCreate(definition, { kind: 'meter-yearly', facilityGuid: this.facility()!.guid, meterGuid: this.meter()!.guid }), submit: command => commands.submit(command), recover: (accountGuid, guid) => commands.recover(accountGuid, guid),
      accountGuid: () => this.store.account()?.guid, ready: () => this.store.isReady(),
      open: (accountGuid, guid) => this.injector.get(VisualizationNavigationService).open(accountGuid, guid),
      registerProtection: (dirty, saving, refreshRequired, discard, preventLeave) => {
        const unregister = unsaved.register(dirty, discard, () => saving() || refreshRequired());
        const unregisterLeave = unsaved.registerNavigationPreflight(preventLeave), unregisterUnload = unsaved.protectBeforeUnload(dirty);
        return () => { unregister(); unregisterLeave(); unregisterUnload(); };
      } };
  });

  constructor() {
    this.destroy.onDestroy(() => this.capture.dispose());
    effect(() => { this.yearToDate.setValue(this.params()?.get('yearlyMode') === 'year-to-date'); });
    let owner = '';
    effect(() => {
      const key = JSON.stringify([this.account()?.guid, this.facility()?.guid, this.meter()?.guid]);
      if (key !== owner) { owner = key; untracked(() => { this.chartView.set(undefined); if (this.reviewed() && !this.capture.needsProtection()) this.closeCapture(); }); }
    });
    this.yearToDate.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => { this.chartView.set(undefined); });
    let anchor = '';
    afterRenderEffect(() => {
      const key = JSON.stringify([this.account()?.guid, this.meter()?.guid, this.fragment()]);
      if (this.fragment() === 'meter-yearly-chart' && key !== anchor && this.workspace.calendarizationState() === 'ready') {
        const target = this.host.querySelector<HTMLElement>('#meter-yearly-chart');
        if (target) { anchor = key; target.scrollIntoView?.({ block: 'start' }); target.focus({ preventScroll: true }); }
      }
      if (this.focusCaptureRequested() && !this.reviewed() && this.chart) { this.chart.focusVisualize(); this.focusCaptureRequested.set(false); }
    });
  }
  setYearToDate(value: boolean): void { if (!this.capture.saving() && !this.capture.refreshRequired()) this.yearToDate.setValue(value); }
  openCapture(view: MeterResultsChartPresentation): void {
    if (this.reviewed() || this.capture.needsProtection()) return;
    this.chartView.set(view); const support = this.captureSupport(); if (support.state !== 'supported') return;
    this.capture.captureAnother(); this.captureError.set(''); this.reviewed.set({ definition: support.definition, revision: this.store.revision() });
  }
  async saveCapture(name: string): Promise<void> {
    if (this.capture.saving()) return;
    if (this.capture.refreshRequired()) { await this.capture.retry(); return; }
    const reviewed = this.reviewed(), support = this.captureSupport();
    if (!reviewed || support.state !== 'supported' || reviewed.revision !== this.store.revision() || JSON.stringify(reviewed.definition) !== JSON.stringify(support.definition)) {
      this.captureError.set('The source chart changed during review. Close this panel and select Visualize again to review the current chart.'); return;
    }
    this.captureError.set('');
    if (this.capture.proposal()) await this.capture.retry(); else if (name.trim()) await this.capture.start({ ...reviewed.definition, name: name.trim() });
  }
  closeCapture(): void {
    if (this.capture.saving() || this.capture.refreshRequired()) return;
    if (this.capture.proposal()) this.capture.discard(); this.reviewed.set(undefined); this.captureError.set(''); this.focusCaptureRequested.set(true);
  }

  @ViewChild('yearlyDataTable', { static: false }) yearlyDataTable?: ElementRef<HTMLTableElement>;

  requestSort(column: MeterYearlyDataColumnId): void {
    if (this.sortColumn() === column) {
      this.sortDirection.update(direction => direction === 'desc' ? 'asc' : 'desc');
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('desc');
    }
  }

  openSettings(): void {
    const facility = this.facility();
    const meter = this.meter();
    if (facility && meter) {
      void this.router.navigate(this.navigation.facilityMeterRoute(facility.guid, meter.guid, 'settings'), { fragment: 'meter-reading-settings' });
    }
  }

  copyTable(): void {
    if (!this.yearlyDataTable) {
      return;
    }
    this.copyingTable.set(true);
    setTimeout(() => {
      this.copyTableService.copyTable(this.yearlyDataTable);
      this.copyingTable.set(false);
    }, 200);
  }

  columnValue(row: MeterResultsChartRow, column: MeterDataColumn<MeterYearlyDataColumnId>): string {
    if (column.id === 'year') return row.periodLabel;
    const value = row.values[column.id];
    return value === null || value === undefined ? '—' : new Intl.NumberFormat('en-US', { maximumFractionDigits: column.currency ? 2 : 1, style: column.currency ? 'currency' : 'decimal', ...(column.currency ? { currency: 'USD' } : {}) }).format(value);
  }
}
