import { Component, Input } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilityOverviewService } from 'src/app/facility/facility-overview/facility-overview.service';
import { FacilityOverviewData, FacilityOverviewMeter } from 'src/app/calculations/dashboard-calculations/facilityOverviewClass';

@Component({
  selector: 'app-emissions-usage-table',
  templateUrl: './emissions-usage-table.component.html',
  styleUrls: ['./emissions-usage-table.component.css']
})
export class EmissionsUsageTableComponent {
  @Input()
  facilityOverviewData: FacilityOverviewData

  emissionsDisplay: 'market' | 'location';
  emissionsDisplaySub: Subscription;

  constructor(
    private facilityOverviewService: FacilityOverviewService) { }

  ngOnInit(): void {
    this.emissionsDisplaySub = this.facilityOverviewService.emissionsDisplay.subscribe(val => {
      this.emissionsDisplay = val;
    });
  }

  ngOnDestroy() {
    this.emissionsDisplaySub.unsubscribe();
  }
}
