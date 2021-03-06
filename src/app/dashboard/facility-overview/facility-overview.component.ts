import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbUtilityMeterData } from 'src/app/models/idb';
import { DashboardService } from '../dashboard.service';

@Component({
  selector: 'app-facility-overview',
  templateUrl: './facility-overview.component.html',
  styleUrls: ['./facility-overview.component.css', '../dashboard.component.css']
})
export class FacilityOverviewComponent implements OnInit {

  utilityMeterFacilityData: Array<IdbUtilityMeterData>;
  utilityMeterDataSub: Subscription;

  graphDisplaySub: Subscription;
  chartsLabel: "Costs" | "Usage";
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

  toggleStackedArea(){
    this.stackedAreaShown = !this.stackedAreaShown;
  }

  toggleBarChart(){
    this.barChartShown = !this.barChartShown;
  }
}
