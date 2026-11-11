import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MeterDataQualityReport, buildMeterDataQualityReport } from '@domain/calculations/data-quality/meter-data-quality';
import { effectiveExpectedRangeSettings } from '@shared/settings-forms/data-validation-settings';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { FacilityMetersWorkspaceService } from '../../facility-meters-workspace.service';
@Component({ selector: 'app-meter-workbench-quality-report', standalone: false,
  templateUrl: './meter-workbench-quality-report.component.html', styleUrls: ['./meter-workbench-quality-report.component.css'] })
export class MeterWorkbenchQualityReportComponent {
  private readonly router = inject(Router);
  private readonly navigation = inject(WorkspaceNavigationService);
  private readonly status = inject(WorkspaceStatusService);
  readonly workspace = inject(FacilityMetersWorkspaceService);
  readonly meter = this.workspace.selectedMeter;
  readonly facility = this.workspace.facility;
  readonly meterData = this.workspace.selectedMeterData;
  readonly expectedRangeEnabled = computed(() => {
    const account = this.workspace.account();
    return account ? effectiveExpectedRangeSettings(account, this.facility()).enabled : true;
  });
  readonly report = computed<MeterDataQualityReport | undefined>(() => {
    const selectedMeter = this.meter();
    if (!selectedMeter) {
      return undefined;
    }
    return buildMeterDataQualityReport(this.meterData(), selectedMeter);
  });
  readonly issueSummaries = computed(() => {
    const meter = this.meter();
    const report = this.report();
    if (!meter || !report) {
      return [];
    }
    if (this.status.state() !== 'ready') {
      return buildIssueSummaries(report, this.expectedRangeEnabled());
    }
    return this.status.meterFindings(meter.guid)
      .filter(finding => this.expectedRangeEnabled() || !['meter.quality.consumption-outlier', 'meter.quality.cost-outlier'].includes(finding.code))
      .filter(finding => finding.category === 'quality' || finding.code === 'meter.data.duplicate-date')
      .map(finding => finding.description);
  });
  openReadings(): void {
    const facility = this.facility();
    const meter = this.meter();
    if (facility && meter) {
      void this.router.navigate(this.navigation.facilityMeterRoute(facility.guid, meter.guid, 'readings'));
    }
  }

}
function buildIssueSummaries(report: MeterDataQualityReport, expectedRangeEnabled: boolean): string[] {
  const issues: string[] = [];
  if (expectedRangeEnabled && report.showConsumption && report.energyOutlierCount > 0) {
    issues.push(`${report.energyOutlierCount} consumption reading${report.energyOutlierCount === 1 ? '' : 's'} outside the expected range.`);
  }
  if (expectedRangeEnabled && report.includeCosts && report.costOutlierCount > 0) {
    issues.push(`${report.costOutlierCount} cost reading${report.costOutlierCount === 1 ? '' : 's'} outside the expected range.`);
  }
  if (report.duplicateMonths.length > 0) {
    issues.push(`${report.duplicateMonths.length} month${report.duplicateMonths.length === 1 ? '' : 's'} with multiple readings.`);
  }
  return issues;
}
