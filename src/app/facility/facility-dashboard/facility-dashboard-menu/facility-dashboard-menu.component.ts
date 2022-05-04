import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { DashboardService } from 'src/app/shared/helper-services/dashboard.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idb';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';

@Component({
  selector: 'app-facility-dashboard-menu',
  templateUrl: './facility-dashboard-menu.component.html',
  styleUrls: ['./facility-dashboard-menu.component.css']
})
export class FacilityDashboardMenuComponent implements OnInit {

  graphDisplay: "cost" | "usage" | "emissions";
  graphDisplaySub: Subscription;
  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription;
  modalOpen: boolean;
  modalOpenSub: Subscription;
  constructor(private facilityDbService: FacilitydbService, private dashboardService: DashboardService,
    private sharedDataService: SharedDataService) { }

  ngOnInit(): void {
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.selectedFacility = val;
    });

    this.graphDisplaySub = this.dashboardService.graphDisplay.subscribe(val => {
      this.graphDisplay = val;
    });

    this.modalOpenSub = this.sharedDataService.modalOpen.subscribe(val => {
      this.modalOpen = val;
    })
  }

  ngOnDestroy() {
    this.graphDisplaySub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
    this.modalOpenSub.unsubscribe();
  }


  setGraphDisplay(str: "cost" | "usage" | "emissions") {
    this.dashboardService.graphDisplay.next(str);
  }

  async setFacilityEnergyIsSource(energyIsSource: boolean) {
    if (this.selectedFacility.energyIsSource != energyIsSource) {
      this.selectedFacility.energyIsSource = energyIsSource;
      let facilities: Array<IdbFacility> = await this.facilityDbService.updateWithObservable(this.selectedFacility).toPromise();
      let accountFacilites: Array<IdbFacility> = facilities.filter(facility => { return facility.accountId == this.selectedFacility.accountId });
      this.facilityDbService.accountFacilities.next(accountFacilites);
      this.facilityDbService.selectedFacility.next(this.selectedFacility);
    }
  }
}
