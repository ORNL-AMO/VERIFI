import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { FacilityMetersWorkspaceService } from '@app/v1/facility/data/meters/facility-meters-workspace.service';
import { meterWorkbenchTab, shouldShowMeterBillInspectionTab } from '@app/v1/facility/data/meters/models';
import { buildBillInspectionReport } from './meter-workbench-bill-inspection.models';

@Component({
  selector: 'app-meter-workbench-bill-inspection',
  templateUrl: './meter-workbench-bill-inspection.component.html',
  styleUrls: ['./meter-workbench-bill-inspection.component.css'],
  standalone: false
})
export class MeterWorkbenchBillInspectionComponent {
  private readonly router = inject(Router);
  private readonly navigation = inject(WorkspaceNavigationService);

  readonly tab = meterWorkbenchTab('bill-inspection');
  readonly workspace = inject(FacilityMetersWorkspaceService);
  readonly meter = this.workspace.selectedMeter;
  readonly facility = this.workspace.facility;
  readonly meterData = this.workspace.selectedMeterData;
  readonly isEligible = computed(() => shouldShowMeterBillInspectionTab(this.meter()));
  readonly report = computed(() => {
    const selectedMeter = this.meter();
    if (!selectedMeter) {
      return undefined;
    }
    return buildBillInspectionReport(selectedMeter, this.meterData());
  });

  openReadings(): void {
    const facility = this.facility();
    const meter = this.meter();
    if (facility && meter) {
      void this.router.navigate(this.navigation.facilityMeterRoute(facility.guid, meter.guid, 'readings'));
    }
  }

  openChargeSettings(): void {
    const facility = this.facility();
    const meter = this.meter();
    if (facility && meter) {
      void this.router.navigate(this.navigation.facilityMeterRoute(facility.guid, meter.guid, 'settings'), { fragment: 'meter-charges' });
    }
  }
}
