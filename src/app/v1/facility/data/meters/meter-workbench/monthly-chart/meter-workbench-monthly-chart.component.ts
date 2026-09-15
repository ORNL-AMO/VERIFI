import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { WorkspaceNavigationService } from '../../../../../shell/workspace-navigation.service';
import { FacilityMetersWorkspaceService } from '../../facility-meters-workspace.service';
import {
  buildMeterDataColumns,
  meterCalendarizationMethodLabel,
  meterDataChartMetrics,
  meterMonthlyChartRows,
  preferredMeterCostMetricId,
  preferredMeterUtilityMetricId
} from '../../facility-meters.models';

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
  readonly columns = computed(() => buildMeterDataColumns(
    this.selectedCalendarizedMeter(),
    this.account(),
    this.isRECs(),
    this.consumptionLabel(),
    'monthly'
  ));
  readonly chartRows = computed(() => meterMonthlyChartRows(this.selectedCalendarizedMeter()?.monthlyData ?? []));
  readonly metrics = computed(() => meterDataChartMetrics(this.columns()));
  readonly defaultLeftMetricId = computed(() => preferredMeterUtilityMetricId(this.columns()));
  readonly defaultRightMetricId = computed(() => preferredMeterCostMetricId(this.columns()));

  openSettings(): void {
    const facility = this.facility();
    const meter = this.meter();
    if (facility && meter) {
      void this.router.navigate(this.navigation.facilityMeterRoute(facility.guid, meter.guid, 'settings'), { fragment: 'meter-reading-settings' });
    }
  }
}
