import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbAccount, IdbAccountAnalysisItem, IdbAccountReport, IdbAnalysisItem, IdbFacility, IdbPredictorEntry, IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { BetterPlantsSummary } from 'src/app/models/overview-report';
import { BetterPlantsReportClass } from 'src/app/calculations/better-plants-calculations/betterPlantsReportClass';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { AccountReportsService } from '../account-reports.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { BetterPlantsExcelWriterService } from '../excel-writer-services/better-plants-excel-writer.service';

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
  betterPlantsSummaries: Array<BetterPlantsSummary>;
  calculating: boolean | 'error';
  worker: Worker;
  selectedAnalysisItem: IdbAccountAnalysisItem;
  generateExcelSub: Subscription
  constructor(private accountReportDbService: AccountReportDbService,
    private accountReportsService: AccountReportsService,
    private router: Router, private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private predictorDbService: PredictordbService,
    private analysisDbService: AnalysisDbService,
    private accountAnalysisDbService: AccountAnalysisDbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private betterPlantsExcelWriterService: BetterPlantsExcelWriterService) { }

  ngOnInit(): void {
    this.printSub = this.accountReportsService.print.subscribe(print => {
      this.print = print;
    });
    this.generateExcelSub = this.accountReportsService.generateExcel.subscribe(generateExcel => {
      if (generateExcel == true) {
        this.generateExcelReport();
      }
    })
    this.selectedReport = this.accountReportDbService.selectedReport.getValue();
    if (!this.selectedReport) {
      this.router.navigateByUrl('/account/reports/dashboard');
    }
    this.account = this.accountDbService.selectedAccount.getValue();
    this.setAnalysisItem();
    this.setBetterPlantsSummary();
  }

  ngOnDestroy() {
    this.printSub.unsubscribe();
    this.generateExcelSub.unsubscribe();
    if (this.worker) {
      this.worker.terminate();
    }
  }

  setAnalysisItem() {
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    let selectedAnalysisItem: IdbAccountAnalysisItem = accountAnalysisItems.find(item => { return item.guid == this.selectedReport.betterPlantsReportSetup.analysisItemId });
    this.selectedAnalysisItem = JSON.parse(JSON.stringify(selectedAnalysisItem));
  }

  setBetterPlantsSummary() {
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.accountPredictorEntries.getValue();
    let accountFacilityAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    let includedFacilityIds: Array<string> = new Array();
    this.selectedAnalysisItem.facilityAnalysisItems.forEach(item => {
      if (item.analysisItemId && item.analysisItemId != 'skip') {
        includedFacilityIds.push(item.facilityId);
      }
    });
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let includedFacilityMeters: Array<IdbUtilityMeter> = accountMeters.filter(meter => { return includedFacilityIds.includes(meter.facilityId) });
    let accountMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('src/app/web-workers/better-plants-report.worker', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        if (!data.error) {
          this.betterPlantsSummaries = data.betterPlantsSummaries;
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
        selectedAnalysisItem: this.selectedAnalysisItem,
        accountPredictorEntries: accountPredictorEntries,
        account: this.account,
        facilities: accountFacilities,
        accountAnalysisItems: accountFacilityAnalysisItems,
        meters: includedFacilityMeters,
        meterData: accountMeterData,
        includeAllYears: this.selectedReport.betterPlantsReportSetup.includeAllYears
      });
    } else {
      // Web Workers are not supported in this environment.
      this.betterPlantsSummaries = new Array();
      let reportYear: number = this.selectedReport.reportYear;
      while (reportYear > this.selectedReport.baselineYear) {
        let betterPlantsReportClass: BetterPlantsReportClass = new BetterPlantsReportClass(
          this.selectedReport.baselineYear,
          reportYear,
          this.selectedAnalysisItem,
          accountPredictorEntries,
          this.account,
          accountFacilities,
          accountFacilityAnalysisItems,
          includedFacilityMeters,
          accountMeterData
        );
        let betterPlantsSummary: BetterPlantsSummary = betterPlantsReportClass.getBetterPlantsSummary();
        this.betterPlantsSummaries.push(betterPlantsSummary);
        if (this.selectedReport.betterPlantsReportSetup.includeAllYears) {
          reportYear--;
        } else {
          reportYear = this.selectedReport.baselineYear;
        }
      }
      this.calculating = false;
    }
  }


  generateExcelReport() {
    this.betterPlantsExcelWriterService.exportToExcel(this.selectedReport, this.account, this.betterPlantsSummaries, this.selectedAnalysisItem);
    this.accountReportsService.generateExcel.next(false);
  }
}
