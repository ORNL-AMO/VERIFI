import { Component, Input } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilityOverviewService } from 'src/app/facility/facility-overview/facility-overview.service';
import { FacilityOverviewData, FacilityOverviewMeter } from 'src/app/calculations/dashboard-calculations/facilityOverviewClass';
import { AccountOverviewData } from 'src/app/calculations/dashboard-calculations/accountOverviewClass';
import { AccountOverviewService } from 'src/app/account/account-overview/account-overview.service';
import { EmissionsTypes, getEmissionsTypeColor } from 'src/app/models/eGridEmissions';

@Component({
  selector: 'app-emissions-usage-table',
  templateUrl: './emissions-usage-table.component.html',
  styleUrls: ['./emissions-usage-table.component.css']
})
export class EmissionsUsageTableComponent {
  @Input()
  overviewData: FacilityOverviewData | AccountOverviewData
  @Input()
  inAccount: boolean;

  emissionsDisplay: 'market' | 'location';
  emissionsDisplaySub: Subscription;

  constructor(
    private facilityOverviewService: FacilityOverviewService,
    private accountOverviewService: AccountOverviewService) { }

  ngOnInit(): void {
    if (!this.inAccount) {
      this.emissionsDisplaySub = this.facilityOverviewService.emissionsDisplay.subscribe(val => {
        this.emissionsDisplay = val;
      });
    } else {
      this.emissionsDisplaySub = this.accountOverviewService.emissionsDisplay.subscribe(val => {
        this.emissionsDisplay = val;
      });
    }
  }

  ngOnDestroy() {
    this.emissionsDisplaySub.unsubscribe();
  }

  getEmissionsTypeColor(emissionsType: EmissionsTypes): string {
    return getEmissionsTypeColor(emissionsType);
  }
}
