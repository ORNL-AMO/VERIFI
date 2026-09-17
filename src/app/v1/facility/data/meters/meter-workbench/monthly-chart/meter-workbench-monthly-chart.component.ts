import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { FacilityMetersWorkspaceService } from '@app/v1/facility/data/meters/facility-meters-workspace.service';
import {
  MeterResultsChartMetric,
  buildMeterDataColumns,
  meterCalendarizationMethodLabel,
  meterDataChartMetrics,
  meterHasLifetimeCost,
  meterMonthlyChartRows,
  preferredMeterCostMetricId,
  preferredMeterUtilityMetricId
} from '@app/v1/facility/data/meters/facility-meters.models';

@Component({
  selector: 'app-meter-workbench-monthly-chart',
  templateUrl: './meter-workbench-monthly-chart.component.html',
  styleUrls: ['./meter-workbench-monthly-chart.component.css'],
  standalone: false
})
export class MeterWorkbenchMonthlyChartComponent {
  private readonly router = inject(Router);
  private readonly navigation = inject(WorkspaceNavigationService);

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
