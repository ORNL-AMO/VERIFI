import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { BetterPlantsSummary } from 'src/app/models/overview-report';
import { BetterPlantsReportClass } from 'src/app/calculations/better-plants-calculations/betterPlantsReportClass';
import { AccountReportsService } from '../account-reports.service';
import { BetterPlantsExcelWriterService } from '../excel-writer-services/better-plants-excel-writer.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { DataEvaluationService } from 'src/app/data-evaluation/data-evaluation.service';

@Component({
  selector: 'app-better-plants-report',
  templateUrl: './better-plants-report.component.html',
  styleUrls: ['./better-plants-report.component.css'],
  standalone: false
})
export class BetterPlantsReportComponent implements OnInit {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  selectedReport: IdbAccountReport;
  printSub: Subscription;
  print: boolean;
  account: IdbAccount;
  betterPlantsSummaries: Array<BetterPlantsSummary>;
  calculating: boolean | 'error';
  worker: Worker;
  selectedAnalysisItem: IdbAccountAnalysisItem;
  generateExcelSub: Subscription
  constructor(
    private accountReportsService: AccountReportsService,
    private router: Router,
    private betterPlantsExcelWriterService: BetterPlantsExcelWriterService,
    private dataEvaluationService: DataEvaluationService
  ) { }

  ngOnInit(): void {
    this.printSub = this.dataEvaluationService.print.subscribe(print => {
      this.print = print;
    });
    this.generateExcelSub = this.accountReportsService.generateExcel.subscribe(generateExcel => {
      if (generateExcel == true) {
        this.generateExcelReport();
      }
    })
    this.selectedReport = this.accountWorkspaceStore.selectedAccountReport();
    if (!this.selectedReport) {
      this.router.navigateByUrl('/data-evaluation/account/reports/dashboard');
    }
    this.account = this.accountWorkspaceStore.account();
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
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = [...this.accountWorkspaceStore.accountAnalyses()];
    let selectedAnalysisItem: IdbAccountAnalysisItem = accountAnalysisItems.find(item => { return item.guid == this.selectedReport.betterPlantsReportSetup.analysisItemId });
    this.selectedAnalysisItem = JSON.parse(JSON.stringify(selectedAnalysisItem));
  }

  setBetterPlantsSummary() {
    let accountFacilities: Array<IdbFacility> = [...this.accountWorkspaceStore.facilities()];
    let accountPredictorEntries: Array<IdbPredictorData> = [...this.accountWorkspaceStore.predictorData()];
    let accountPredictors: Array<IdbPredictor> = [...this.accountWorkspaceStore.predictors()];
    let accountFacilityAnalysisItems: Array<IdbAnalysisItem> = [...this.accountWorkspaceStore.facilityAnalyses()];
    let includedFacilityIds: Array<string> = new Array();
    this.selectedAnalysisItem.facilityAnalysisItems.forEach(item => {
      if (item.analysisItemId && item.analysisItemId != 'skip') {
        includedFacilityIds.push(item.facilityId);
      }
    });
    let accountMeters: Array<IdbUtilityMeter> = [...this.accountWorkspaceStore.meters()];
    let includedFacilityMeters: Array<IdbUtilityMeter> = accountMeters.filter(meter => { return includedFacilityIds.includes(meter.facilityId) });
    let accountMeterData: Array<IdbUtilityMeterData> = [...this.accountWorkspaceStore.meterData()];
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('../../../../web-workers/better-plants-report.worker', import.meta.url));
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
        includeAllYears: this.selectedReport.betterPlantsReportSetup.includeAllYears,
        accountPredictors: accountPredictors
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
          accountMeterData,
          accountPredictors
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
