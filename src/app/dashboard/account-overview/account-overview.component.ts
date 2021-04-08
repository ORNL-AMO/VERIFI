import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { IdbUtilityMeterData } from 'src/app/models/idb';
import { UtilityMeterDatadbService } from '../../indexedDB/utilityMeterData-db.service';
import { DashboardService } from '../dashboard.service';

@Component({
  selector: 'app-account-overview',
  templateUrl: './account-overview.component.html',
  styleUrls: ['./account-overview.component.css', '../dashboard.component.css']
})
export class AccountOverviewComponent implements OnInit {

  todaysDate: Date;
  yearAgoDate: Date;
  utilityMeterAccountData: Array<IdbUtilityMeterData>;
  accountMeterDataSub: Subscription;
  
  graphDisplaySub: Subscription;
  chartsLabel: "Costs" | "Usage";
  heatMapShown: boolean = false;
  constructor(public utilityMeterDataDbService: UtilityMeterDatadbService, private dashboardService: DashboardService) { }

  ngOnInit(): void {
    this.todaysDate = new Date();
    this.yearAgoDate = new Date((this.todaysDate.getFullYear() - 1), this.todaysDate.getMonth());   

    this.accountMeterDataSub = this.utilityMeterDataDbService.accountMeterData.subscribe(utilityMeterAccountData => {
      this.utilityMeterAccountData = utilityMeterAccountData;
    });

    this.graphDisplaySub = this.dashboardService.graphDisplay.subscribe(value => {
      if(value == "cost"){
        this.chartsLabel = "Costs";
      }else if(value == "usage"){
        this.chartsLabel = "Usage";
      }
    })
  }

  ngOnDestroy() {
    this.accountMeterDataSub.unsubscribe();
    this.graphDisplaySub.unsubscribe();
  }

  toggleHeatMap(){
    this.heatMapShown = !this.heatMapShown;
  }

}
