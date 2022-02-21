import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { AccountdbService } from './indexedDB/account-db.service';
import { AnalysisDbService } from './indexedDB/analysis-db.service';
import { FacilitydbService } from './indexedDB/facility-db.service';
import { OverviewReportOptionsDbService } from './indexedDB/overview-report-options-db.service';
import { PredictordbService } from './indexedDB/predictors-db.service';
import { UtilityMeterdbService } from './indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from './indexedDB/utilityMeterData-db.service';
import { UtilityMeterGroupdbService } from './indexedDB/utilityMeterGroup-db.service';
import { IdbAccount } from './models/idb';
import { EGridService } from './shared/helper-services/e-grid.service';

// declare ga as a function to access the JS code in TS
declare let gtag: Function;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {


  dataInitialized: boolean = false;
  loadingMessage: string = "Loading Accounts...";
  constructor(
    private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private predictorsDbService: PredictordbService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    public router: Router,
    private eGridService: EGridService,
    private overviewReportOptionsDbService: OverviewReportOptionsDbService,
    private analysisDbService: AnalysisDbService) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        gtag('config', 'G-YG1QD02XSE',
          {
            'page_path': event.urlAfterRedirects
          }
        );
      }
    })
  }



  ngOnInit() {
    this.initializeData();
    this.eGridService.parseEGridData();

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
    this.loadingMessage = 'Loading Reports...'
    await this.overviewReportOptionsDbService.initializeReportsFromLocalStorage();
    this.loadingMessage = 'Loading Analysis Items...';
    await this.analysisDbService.initializeAnalysisItems();
    this.dataInitialized = true;
    let allAccounts: Array<IdbAccount> = this.accountDbService.allAccounts.getValue();
    if (allAccounts.length == 0) {
      console.log('nav');
      this.router.navigateByUrl('setup-wizard');
    }
  }
}
