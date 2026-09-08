import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { WorkspaceNavigationService } from '../../../../shell/workspace-navigation.service';
import { FacilityMetersWorkspaceService } from '../facility-meters-workspace.service';

@Component({
  selector: 'app-meters-dashboard',
  templateUrl: './meters-dashboard.component.html',
  styleUrls: ['./meters-dashboard.component.css'],
  standalone: false
})
export class MetersDashboardComponent {
  private readonly router = inject(Router);

  readonly workspace = inject(FacilityMetersWorkspaceService);
  readonly navigation = inject(WorkspaceNavigationService);

  openMeter(meter: IdbUtilityMeter): void {
    const facility = this.workspace.facility();
    if (facility) {
      void this.router.navigate(this.navigation.facilityMeterRoute(facility.guid, meter.guid, 'settings'));
    }
  }
}
