import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { AccountSavingsReportSetup, PerformanceReportSetup } from 'src/app/models/overview-report';
import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { PerformanceReport } from 'src/app/calculations/performance-report-calculations/performanceReport';
import { DataEvaluationService } from 'src/app/data-evaluation/data-evaluation.service';
import { AccountSavingsReport } from 'src/app/calculations/savings-report-calculations/accountSavingsReport';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { AnalysisService } from 'src/app/data-evaluation/facility/analysis/analysis.service';

@Component({
  selector: 'app-account-savings-report',
  standalone: false,

  templateUrl: './account-savings-report.component.html',
  styleUrl: './account-savings-report.component.css'
})
export class AccountSavingsReportComponent {
  selectedReport: IdbAccountReport;
  account: IdbAccount;
  selectedAnalysisItem: IdbAccountAnalysisItem;
  accountSavingsReportSetup: AccountSavingsReportSetup;
  accountAnalysisItems: Array<IdbAccountAnalysisItem>;
  printSub: Subscription;
  print: boolean;
  itemsPerPage: number;
  itemsPerPageSub: Subscription;

  setupDetails: PerformanceReportSetup = {
    analysisItemId: '',
    includeFacilityPerformanceDetails: false,
    includeUtilityPerformanceDetails: false,
    includeGroupPerformanceDetails: false,
    groupPerformanceByYear: false,
    numberOfTopPerformers: 5,
    includeActual: false,
    includeAdjusted: false,
    includeContribution: false,
    includeSavings: false,
    includeTopPerformersTable: false
  };

  worker: Worker;
  calculating: boolean | 'error' = true;
  performanceReport: PerformanceReport;
  annualAnalysisSummaries: Array<AnnualAnalysisSummary>;
  monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
  facilitySummaries: Array<{
    facility: IdbFacility,
    analysisItem: IdbAnalysisItem,
    monthlySummaryData: Array<MonthlyAnalysisSummaryData>,
    annualAnalysisSummaries: Array<AnnualAnalysisSummary>,
    latestMonthSummary: MonthlyAnalysisSummaryData
  }>;
  latestMonthSummary: MonthlyAnalysisSummaryData;

  constructor(private accountReportDbService: AccountReportDbService,
    private accountAnalysisDbService: AccountAnalysisDbService,
    private router: Router,
    private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private predictorDbService: PredictorDbService,
    private predictorDataDbService: PredictorDataDbService,
    private analysisDbService: AnalysisDbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private sharedDataService: SharedDataService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private analysisService: AnalysisService,
    private dataEvaluationService: DataEvaluationService
  ) { }

  ngOnInit(): void {
    this.printSub = this.dataEvaluationService.print.subscribe(print => {
      this.print = print;
    });
    this.itemsPerPageSub = this.sharedDataService.itemsPerPage.subscribe(val => {
      this.itemsPerPage = val;
    });
    this.selectedReport = this.accountReportDbService.selectedReport.getValue();
    this.analysisService.analysisTableColumns.next(this.selectedReport.accountSavingsReportSetup.analysisTableColumns);
    if (!this.selectedReport) {
      this.router.navigateByUrl('/account/reports/dashboard');
    } else {
      this.accountSavingsReportSetup = this.selectedReport.accountSavingsReportSetup;
    }
    this.account = this.accountDbService.selectedAccount.getValue();
    this.accountAnalysisItems = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    this.selectedAnalysisItem = this.accountAnalysisItems.find(item => { return item.guid == this.selectedReport.accountSavingsReportSetup.analysisItemId });
    this.calculateSavingsReport();
    this.getSetupDetails();
  }

  getSetupDetails() {
    const reportSetup = this.selectedReport.accountSavingsReportSetup;
    this.setupDetails = {
      analysisItemId: reportSetup.analysisItemId,
      includeFacilityPerformanceDetails: reportSetup.includePerformanceResultsTable,
      includeUtilityPerformanceDetails: false,
      includeGroupPerformanceDetails: false,
      groupPerformanceByYear: false,
      numberOfTopPerformers: reportSetup.numberOfTopPerformers,
      includeActual: reportSetup.includePerformanceActual,
      includeAdjusted: reportSetup.includePerformanceAdjusted,
      includeContribution: reportSetup.includePerformanceContribution,
      includeSavings: reportSetup.includePerformanceSavings,
      includeTopPerformersTable: false
    };
  }

  ngOnDestroy(): void {
    this.printSub.unsubscribe();
    if (this.worker) {
      this.worker.terminate();
    }
    this.itemsPerPageSub.unsubscribe();
  }

  calculateSavingsReport() {
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let accountPredictorEntries: Array<IdbPredictorData> = this.predictorDataDbService.accountPredictorData.getValue();
    let accountPredictors: Array<IdbPredictor> = this.predictorDbService.accountPredictors.getValue();
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
      this.worker = new Worker(new URL('src/app/web-workers/account-savings-report.worker', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        if (!data.error) {
          let accountSavingsReport: AccountSavingsReport = data.accountSavingsReport;
          this.performanceReport = accountSavingsReport.performanceReport;
          this.annualAnalysisSummaries = accountSavingsReport.annualAnalysisSummaries;
          this.monthlyAnalysisSummaryData = accountSavingsReport.monthlyAnalysisSummaryData;
          this.latestMonthSummary = accountSavingsReport.latestMonthSummary;
          this.facilitySummaries = accountSavingsReport.facilitySummaries;
          this.calculating = false;
        } else {
          this.calculating = 'error';
        }
        this.worker.terminate();
      };
      this.calculating = true;
      this.worker.postMessage({
        report: this.selectedReport,
        selectedAnalysisItem: this.selectedAnalysisItem,
        accountPredictorEntries: accountPredictorEntries,
        account: this.account,
        facilities: accountFacilities,
        accountAnalysisItems: accountFacilityAnalysisItems,
        meters: includedFacilityMeters,
        meterData: accountMeterData,
        accountPredictors: accountPredictors
      });
    } else {
      // Web Workers are not supported in this environment.
      let accountSavingsReport: AccountSavingsReport = new AccountSavingsReport(
        this.selectedReport,
        this.selectedAnalysisItem,
        accountPredictorEntries,
        this.account,
        accountFacilities,
        accountFacilityAnalysisItems,
        includedFacilityMeters,
        accountMeterData,
        accountPredictors);
      this.performanceReport = accountSavingsReport.performanceReport;
      this.annualAnalysisSummaries = accountSavingsReport.annualAnalysisSummaries;
      this.monthlyAnalysisSummaryData = accountSavingsReport.monthlyAnalysisSummaryData;
      this.latestMonthSummary = accountSavingsReport.latestMonthSummary;
      this.facilitySummaries = accountSavingsReport.facilitySummaries;
      this.calculating = false;
    }
  }
}

