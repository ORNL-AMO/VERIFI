import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { DashboardService } from 'src/app/shared/helper-services/dashboard.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbFacility, IdbUtilityMeterData } from 'src/app/models/idb';
import { Router } from '@angular/router';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';

@Component({
  selector: 'app-facility-dashboard',
  templateUrl: './facility-dashboard.component.html',
  styleUrls: ['./facility-dashboard.component.css']
})
export class FacilityDashboardComponent implements OnInit {

  utilityMeterFacilityData: Array<IdbUtilityMeterData>;
  selectedFacilitySub: Subscription;

  graphDisplaySub: Subscription;
  chartsLabel: "Costs" | "Usage" | "Emissions";
  heatMapShown: boolean = false;
  stackedAreaShown: boolean = true;
  barChartShown: boolean = true;
  constructor(public utilityMeterDataDbService: UtilityMeterDatadbService, private dashboardService: DashboardService,
    private router: Router, private facilitydbService: FacilitydbService) { }

  ngOnInit(): void {
    this.selectedFacilitySub = this.facilitydbService.selectedFacility.subscribe(value => {
      this.utilityMeterFacilityData = this.utilityMeterDataDbService.facilityMeterData.getValue();
      if (this.utilityMeterFacilityData.length != 0) {
        this.dashboardService.setFacilityDashboardSummary();
      }
    });

    this.graphDisplaySub = this.dashboardService.graphDisplay.subscribe(value => {
      if (value == "cost") {
        this.chartsLabel = "Costs";
      } else if (value == "usage") {
        this.chartsLabel = "Usage";
      } else if (value == "emissions") {
        this.chartsLabel = "Emissions";
      }
    });
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
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

  goToUtilityData() {
    let selectedFacility: IdbFacility = this.facilitydbService.selectedFacility.getValue();
    this.router.navigateByUrl('facility/' + selectedFacility.id + '/utility');
  }

}
