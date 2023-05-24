import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbAccount, IdbAccountAnalysisItem, IdbAccountReport, IdbAnalysisItem, IdbFacility, IdbPredictorEntry, IdbUtilityMeter } from 'src/app/models/idb';
import { BetterPlantsSummary } from 'src/app/models/overview-report';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { ConvertMeterDataService } from 'src/app/shared/helper-services/convert-meter-data.service';
import { BetterPlantsReportClass } from 'src/app/calculations/better-plants-calculations/betterPlantsReportClass';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { AccountReportsService } from '../account-reports.service';

@Component({
  selector: 'app-better-plants-report',
  templateUrl: './better-plants-report.component.html',
  styleUrls: ['./better-plants-report.component.css']
})
export class BetterPlantsReportComponent implements OnInit {

  selectedReport: IdbAccountReport;
  printSub: Subscription;
  print: boolean;
  account: IdbAccount;
  betterPlantsSummary: BetterPlantsSummary;
  calculating: boolean | 'error';
  worker: Worker;
  constructor(private accountReportDbService: AccountReportDbService,
    private accountReportsService: AccountReportsService,
    private router: Router, private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private predictorDbService: PredictordbService,
    private analysisDbService: AnalysisDbService,
    private accountAnalysisDbService: AccountAnalysisDbService,
    private convertMeterDataService: ConvertMeterDataService,
    private calanderizationService: CalanderizationService,
    private utilityMeterDbService: UtilityMeterdbService) { }

  ngOnInit(): void {
    this.printSub = this.accountReportsService.print.subscribe(print => {
      this.print = print;
    });
    this.selectedReport = this.accountReportDbService.selectedReport.getValue();
    if (!this.selectedReport) {
      this.router.navigateByUrl('/account/reports/dashboard');
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


  setBetterPlantsSummary() {
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();

    let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.accountPredictorEntries.getValue();
    let accountFacilityAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    let selectedAnalysisItem: IdbAccountAnalysisItem = accountAnalysisItems.find(item => { return item.guid == this.selectedReport.betterPlantsReportSetup.analysisItemId });
    selectedAnalysisItem.energyUnit = 'MMBtu';
    let includedFacilityIds: Array<string> = new Array();
    selectedAnalysisItem.facilityAnalysisItems.forEach(item => {
      if (item.analysisItemId && item.analysisItemId != 'skip') {
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
        if (!data.error) {
          this.betterPlantsSummary = data.betterPlantsSummary;
          this.calculating = false;
        } else {
          this.calculating = 'error';
        }
        this.worker.terminate();
      };
      this.calculating = true;
      this.worker.postMessage({
        baselineYear: this.selectedReport.baselineYear,
        reportYear: this.selectedReport.reportYear,
        selectedAnalysisItem: selectedAnalysisItem,
        calanderizedMeters: calanderizedMeters,
        accountPredictorEntries: accountPredictorEntries,
        account: this.account,
        facilities: accountFacilities,
        accountAnalysisItems: accountFacilityAnalysisItems
      });
    } else {
      // Web Workers are not supported in this environment.
      let betterPlantsReportClass: BetterPlantsReportClass = new BetterPlantsReportClass(
        this.selectedReport.baselineYear,
        this.selectedReport.reportYear,
        selectedAnalysisItem,
        calanderizedMeters,
        accountPredictorEntries,
        this.account,
        accountFacilities,
        accountFacilityAnalysisItems
      );
      this.betterPlantsSummary = betterPlantsReportClass.getBetterPlantsSummary();
    }
  }
}
