import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { DashboardService } from 'src/app/shared/helper-services/dashboard.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbUtilityMeterData } from 'src/app/models/idb';

@Component({
  selector: 'app-facility-dashboard',
  templateUrl: './facility-dashboard.component.html',
  styleUrls: ['./facility-dashboard.component.css']
})
export class FacilityDashboardComponent implements OnInit {

  utilityMeterFacilityData: Array<IdbUtilityMeterData>;
  utilityMeterDataSub: Subscription;

  graphDisplaySub: Subscription;
  chartsLabel: "Costs" | "Usage" | "Emissions";
  heatMapShown: boolean = false;
  stackedAreaShown: boolean = true;
  barChartShown: boolean = true;
  constructor(public utilityMeterDataDbService: UtilityMeterDatadbService, private dashboardService: DashboardService) { }

  ngOnInit(): void {
    this.utilityMeterDataSub = this.utilityMeterDataDbService.facilityMeterData.subscribe(utilityMeterFacilityData => {
      this.utilityMeterFacilityData = utilityMeterFacilityData;
    });

    this.graphDisplaySub = this.dashboardService.graphDisplay.subscribe(value => {
      if (value == "cost") {
        this.chartsLabel = "Costs";
      } else if (value == "usage") {
        this.chartsLabel = "Usage";
      } else if (value == "emissions") {
        this.chartsLabel = "Emissions";
      }
    })
  }

  ngOnDestroy() {
    this.utilityMeterDataSub.unsubscribe();
    this.graphDisplaySub.unsubscribe();
  }

  toggleHeatMap() {
    this.heatMapShown = !this.heatMapShown;
  }

  toggleStackedArea() {
    this.stackedAreaShown = !this.stackedAreaShown;
  }

  toggleBarChart() {
    this.barChartShown = !this.barChartShown;
  }

}
