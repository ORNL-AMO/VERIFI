import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { DashboardService } from 'src/app/shared/helper-services/dashboard.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idb';

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
  constructor(private facilityDbService: FacilitydbService, private dashboardService: DashboardService) { }

  ngOnInit(): void {
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.selectedFacility = val;
    });
    
    this.graphDisplaySub = this.dashboardService.graphDisplay.subscribe(val => {
      this.graphDisplay = val;
    });
  }

  ngOnDestroy(){
    this.graphDisplaySub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
  }


  setGraphDisplay(str: "cost" | "usage" | "emissions") {
    this.dashboardService.graphDisplay.next(str);
  }
  setFacilityEnergyIsSource(energyIsSource: boolean) {
    this.selectedFacility.energyIsSource = energyIsSource;
    this.facilityDbService.update(this.selectedFacility);
  }
}
