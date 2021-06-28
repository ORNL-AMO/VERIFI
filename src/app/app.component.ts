import { Component } from '@angular/core';
import { AccountdbService } from './indexedDB/account-db.service';
import { FacilitydbService } from './indexedDB/facility-db.service';
import { PredictordbService } from './indexedDB/predictors-db.service';
import { UtilityMeterdbService } from './indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from './indexedDB/utilityMeterData-db.service';
import { UtilityMeterGroupdbService } from './indexedDB/utilityMeterGroup-db.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {


  dataInitialized: boolean = false;
  loadingMessage: string = "Loading Accounts...";
  constructor(private accountDbService: AccountdbService, private facilityDbService: FacilitydbService, private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService, private predictorsDbService: PredictordbService,
     private utilityMeterGroupDbService: UtilityMeterGroupdbService) {
  }

  ngOnInit() {
    this.initializeData();
  }

  async initializeData() {
    await this.accountDbService.initializeAccountFromLocalStorage();
    this.loadingMessage = "Loading Facilities..";
    await this.facilityDbService.initializeFacilityFromLocalStorage();
    this.loadingMessage = "Loading Meters..";
    await this.utilityMeterDbService.initializeMeterData();
    this.loadingMessage = "Loading Meter Data..";
    await this.utilityMeterDataDbService.initializeMeterData();
    this.loadingMessage = "Loading Predictors..";
    await this.predictorsDbService.initializePredictorData();
    this.loadingMessage = "Loading Meter Groups..";
    await this.utilityMeterGroupDbService.initializeMeterGroups();
    this.dataInitialized = true;
  }

  showToggle() {
    console.log("toggling");
  }
}
