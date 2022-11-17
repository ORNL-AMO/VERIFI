import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { OverviewReportOptionsDbService } from 'src/app/indexedDB/overview-report-options-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbAccount, IdbAccountAnalysisItem, IdbAnalysisItem, IdbFacility, IdbOverviewReportOptions, IdbPredictorEntry, IdbUtilityMeter } from 'src/app/models/idb';
import { BetterPlantsSummary, ReportOptions } from 'src/app/models/overview-report';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { ConvertMeterDataService } from 'src/app/shared/helper-services/convert-meter-data.service';
import { BetterPlantsReportClass } from 'src/app/web-workers/classes/betterPlantsReportClass';
import { OverviewReportService } from '../overview-report.service';

@Component({
  selector: 'app-better-plants-report',
  templateUrl: './better-plants-report.component.html',
  styleUrls: ['./better-plants-report.component.css']
})
export class BetterPlantsReportComponent implements OnInit {

  reportOptions: ReportOptions;
  printSub: Subscription;
  print: boolean;
  account: IdbAccount;
  betterPlantsSummary: BetterPlantsSummary;
  calculating: boolean;
  worker: Worker;
  constructor(private overviewReportService: OverviewReportService, private overviewReportOptionsDbService: OverviewReportOptionsDbService,
    private router: Router, private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private predictorDbService: PredictordbService,
    private analysisDbService: AnalysisDbService,
    private accountAnalysisDbService: AccountAnalysisDbService,
    private convertMeterDataService: ConvertMeterDataService,
    private calanderizationService: CalanderizationService,
    private utilityMeterDbService: UtilityMeterdbService) { }

  ngOnInit(): void {
    this.printSub = this.overviewReportService.print.subscribe(print => {
      this.print = print;
      if (this.print) {
        this.printReport();
      }
    });
    this.reportOptions = this.overviewReportService.reportOptions.getValue();
    if (!this.reportOptions) {
      let selectedOptions: IdbOverviewReportOptions = this.overviewReportOptionsDbService.selectedOverviewReportOptions.getValue()
      if (selectedOptions) {
        this.reportOptions = selectedOptions.reportOptions;
      } else {
        this.router.navigateByUrl('/overview-report/report-dashboard');
      }
    }
    this.account = this.accountDbService.selectedAccount.getValue();
    this.setBetterPlantsSummary();
  }

  ngOnDestroy() {
    this.printSub.unsubscribe();
    if (this.worker) {
      this.worker.terminate();
    }
  }

  printReport() {
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
      setTimeout(() => {
        window.print();
        this.overviewReportService.print.next(false)
      }, 100)
    }, 100)
  }


  setBetterPlantsSummary() {
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();

    let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.accountPredictorEntries.getValue();
    let accountFacilityAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    let selectedAnalysisItem: IdbAccountAnalysisItem = accountAnalysisItems.find(item => { return item.guid == this.reportOptions.analysisItemId });
    selectedAnalysisItem.energyUnit = 'MMBtu';
    let includedFacilityIds: Array<string> = new Array();
    selectedAnalysisItem.facilityAnalysisItems.forEach(item => {
      if (item.analysisItemId) {
        includedFacilityIds.push(item.facilityId);
      }
    });
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let includedFacilityMeters: Array<IdbUtilityMeter> = accountMeters.filter(meter => { return includedFacilityIds.includes(meter.facilityId) });
    let calanderizedMeters: Array<CalanderizedMeter> = this.calanderizationService.getCalanderizedMeterData(includedFacilityMeters, true, true, { energyIsSource: true });
    calanderizedMeters.forEach(calanderizedMeter => {
      calanderizedMeter.monthlyData = this.convertMeterDataService.convertMeterDataToAnalysis(selectedAnalysisItem, calanderizedMeter.monthlyData, this.account, calanderizedMeter.meter);
    });



    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('src/app/web-workers/better-plants-report.worker', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        this.betterPlantsSummary = data;
        this.calculating = false;
        this.worker.terminate();
      };
      this.calculating = true;
      this.worker.postMessage({
        reportOptions: this.reportOptions,
        selectedAnalysisItem: selectedAnalysisItem,
        calanderizedMeters: calanderizedMeters,
        accountPredictorEntries: accountPredictorEntries,
        account: this.account,
        facilities: accountFacilities,
        accountAnalysisItems: accountFacilityAnalysisItems
      });
    } else {
      console.log('nopee')
      let betterPlantsReportClass: BetterPlantsReportClass = new BetterPlantsReportClass(
        this.reportOptions,
        selectedAnalysisItem,
        calanderizedMeters,
        accountPredictorEntries,
        this.account,
        accountFacilities,
        accountFacilityAnalysisItems
      );
      this.betterPlantsSummary = betterPlantsReportClass.getBetterPlantsSummary();
      // Web Workers are not supported in this environment.
      // You should add a fallback so that your program still executes correctly.
    }
  }
}
