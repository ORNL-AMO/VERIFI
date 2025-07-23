import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { AccountSavingsReportSetup } from 'src/app/models/overview-report';
import { AccountReportsService } from '../account-reports.service';
import { AnnualAccountAnalysisSummaryClass } from 'src/app/calculations/analysis-calculations/annualAccountAnalysisSummaryClass';
import { AnnualFacilityAnalysisSummaryClass } from 'src/app/calculations/analysis-calculations/annualFacilityAnalysisSummaryClass';
import { getCalanderizedMeterData } from 'src/app/calculations/calanderization/calanderizeMeters';
import { getNeededUnits } from 'src/app/calculations/shared-calculations/calanderizationFunctions';
import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { CalanderizedMeter } from 'src/app/models/calanderization';
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
import { PerformanceReport, PerformanceReportAnnualData } from 'src/app/calculations/performance-report-calculations/performanceReport';
import { data } from 'browserslist';

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

  calculatingAnalysis: boolean | 'error';
  calculatingPerformance: boolean | 'error';
  annualAnalysisSummary: Array<AnnualAnalysisSummary>;
  selectedAnnualAnalysisSummary: Array<AnnualAnalysisSummary>;
  workerAnalysis: Worker;
  workerPerformance: Worker;
  monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData> = [];
  facilitySummaries: Array<{ facility: IdbFacility, analysisItem: IdbAnalysisItem, monthlySummaryData: Array<MonthlyAnalysisSummaryData> }> = [];
  selectedFacilitySummaries: Array<{ facilitySummary: { facility: IdbFacility, analysisItem: IdbAnalysisItem, monthlySummaryData: Array<MonthlyAnalysisSummaryData> }, annualFacilityAnalysisSummaries: Array<AnnualAnalysisSummary> }> = [];
  annualFacilityAnalysisSummaries: Array<AnnualAnalysisSummary> = [];
  accountPredictorEntries: Array<IdbPredictorData> = [];
  accountPredictors: Array<IdbPredictor> = [];
  meters: Array<IdbUtilityMeter> = [];
  meterData: Array<IdbUtilityMeterData> = [];
  facilitySummariesWithAnnual: Array<{ facilitySummary: { facility: IdbFacility, analysisItem: IdbAnalysisItem, monthlySummaryData: Array<MonthlyAnalysisSummaryData> }, annualFacilityAnalysisSummaries: Array<AnnualAnalysisSummary> }> = [];
  performanceReport: PerformanceReport;
  selectedPerformanceReport: PerformanceReport;
  accountFacilities: Array<IdbFacility> = [];
  analysisItems: Array<IdbAnalysisItem> = [];

  constructor(private accountReportDbService: AccountReportDbService,
    private accountReportsService: AccountReportsService,
    private accountAnalysisDbService: AccountAnalysisDbService,
    private router: Router,
    private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private predictorDbService: PredictorDbService,
    private predictorDataDbService: PredictorDataDbService,
    private analysisDbService: AnalysisDbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
  ) { }

  ngOnInit(): void {
    this.printSub = this.accountReportsService.print.subscribe(print => {
      this.print = print;
    });
    this.selectedReport = this.accountReportDbService.selectedReport.getValue();
    if (!this.selectedReport) {
      this.router.navigateByUrl('/account/reports/dashboard');
    } else {
      this.accountSavingsReportSetup = this.selectedReport.accountSavingsReportSetup;
    }
    this.account = this.accountDbService.selectedAccount.getValue();
    this.accountAnalysisItems = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    this.selectedAnalysisItem = this.accountAnalysisItems.find(item => { return item.guid == this.selectedReport.accountSavingsReportSetup.analysisItemId });
    this.selectedReport.baselineYear = this.selectedAnalysisItem.baselineYear;
    this.selectedReport.reportYear = this.selectedAnalysisItem.reportYear;

    this.accountFacilities = this.facilityDbService.accountFacilities.getValue();
    this.accountPredictorEntries = this.predictorDataDbService.accountPredictorData.getValue();
    this.accountPredictors = this.predictorDbService.accountPredictors.getValue();
    this.analysisItems = this.analysisDbService.accountAnalysisItems.getValue();
    this.meters = this.utilityMeterDbService.accountMeters.getValue();
    this.meterData = this.utilityMeterDataDbService.accountMeterData.getValue();
    this.calculateAnnualSavings();
    this.calculatePerformanceData();
  }

  calculatePerformanceData() {
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
      this.workerPerformance = new Worker(new URL('src/app/web-workers/performance-report.worker', import.meta.url));
      this.workerPerformance.onmessage = ({ data }) => {
        if (!data.error) {
          this.performanceReport = data.performanceReport;
          this.calculatingPerformance = false;
          this.getSelectedPerformanceSummaries();
        } else {
          this.calculatingPerformance = 'error';
        }
        this.workerPerformance.terminate();
      };
      this.calculatingPerformance = true;
      this.workerPerformance.postMessage({
        baselineYear: this.selectedReport.baselineYear,
        reportYear: this.selectedReport.reportYear,
        selectedAnalysisItem: this.selectedAnalysisItem,
        accountPredictorEntries: this.accountPredictorEntries,
        account: this.account,
        facilities: this.accountFacilities,
        accountAnalysisItems: this.analysisItems,
        meters: includedFacilityMeters,
        meterData: accountMeterData,
        accountPredictors: this.accountPredictors
      });
    } else {
      // Web Workers are not supported in this environment.
      this.performanceReport = new PerformanceReport(
        this.selectedReport.baselineYear,
        this.selectedReport.reportYear,
        this.selectedAnalysisItem,
        this.accountPredictorEntries,
        this.account,
        this.accountFacilities,
        this.analysisItems,
        includedFacilityMeters,
        accountMeterData,
        this.accountPredictors);
      this.calculatingPerformance = false;
      this.getSelectedPerformanceSummaries();
    }
  }

  calculateAnnualSavings() {
    if (typeof Worker !== 'undefined') {
      this.workerAnalysis = new Worker(new URL('src/app/web-workers/annual-account-analysis.worker', import.meta.url));
      this.workerAnalysis.onmessage = ({ data }) => {
        this.workerAnalysis.terminate();
        if (!data.error) {
          this.annualAnalysisSummary = data.annualAnalysisSummaries;
          this.monthlyAnalysisSummaryData = data.monthlyAnalysisSummaryData;
          this.facilitySummaries = data.facilitySummaries;
          this.calculatingAnalysis = false;
          this.getFacilityData();
        } else {
          this.calculatingAnalysis = 'error';
        }
      };
      this.calculatingAnalysis = true;
      this.workerAnalysis.postMessage({
        accountAnalysisItem: this.selectedAnalysisItem,
        account: this.account,
        accountFacilities: this.accountFacilities,
        accountPredictorEntries: this.accountPredictorEntries,
        allAccountAnalysisItems: this.analysisItems,
        calculateAllMonthlyData: false,
        meters: this.meters,
        meterData: this.meterData,
        accountPredictors: this.accountPredictors
      });
    } else {
      // Web Workers are not supported in this environment.
      let annualAnalysisSummaryClass: AnnualAccountAnalysisSummaryClass = new AnnualAccountAnalysisSummaryClass(this.selectedAnalysisItem, this.account, this.accountFacilities, this.accountPredictorEntries, this.analysisItems, false, this.meters, this.meterData, this.accountPredictors);
      let annualAnalysisSummaries: Array<AnnualAnalysisSummary> = annualAnalysisSummaryClass.getAnnualAnalysisSummaries();
      let monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData> = annualAnalysisSummaryClass.monthlyAnalysisSummaryData;
      this.annualAnalysisSummary = annualAnalysisSummaries;
      this.monthlyAnalysisSummaryData = monthlyAnalysisSummaryData;
      this.facilitySummaries = annualAnalysisSummaryClass.facilitySummaries;
      this.calculatingAnalysis = false;
      this.getFacilityData();
    }
  }

  getFacilityData() {
    this.facilitySummaries.forEach(facilitySummary => {
      let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.getFacilityMetersByFacilityGuid(facilitySummary.analysisItem.facilityId);
      let facilityMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getFacilityMeterDataByFacilityGuid(facilitySummary.analysisItem.facilityId);
      let accountPredictorEntries: Array<IdbPredictorData> = this.predictorDataDbService.getByFacilityId(facilitySummary.analysisItem.facilityId);
      let accountPredictors: Array<IdbPredictor> = this.predictorDbService.getByFacilityId(facilitySummary.analysisItem.facilityId);
      let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(facilityMeters, facilityMeterData, facilitySummary.facility, false, { energyIsSource: facilitySummary.analysisItem.energyIsSource, neededUnits: getNeededUnits(facilitySummary.analysisItem) }, [], [], [facilitySummary.facility], this.account.assessmentReportVersion);
      let annualFacilityAnalysisSummaryClass: AnnualFacilityAnalysisSummaryClass = new AnnualFacilityAnalysisSummaryClass(facilitySummary.analysisItem, facilitySummary.facility, calanderizedMeters, accountPredictorEntries, false, accountPredictors, undefined, true);
      this.annualFacilityAnalysisSummaries = annualFacilityAnalysisSummaryClass.getAnnualAnalysisSummaries();
      this.facilitySummariesWithAnnual.push({
        facilitySummary,
        annualFacilityAnalysisSummaries: this.annualFacilityAnalysisSummaries
      });
    });
    this.getSelectedSummaries();
  }

  getSelectedSummaries() {
    if (this.selectedReport.endMonth != 11) {
      this.selectedAnnualAnalysisSummary = this.annualAnalysisSummary.filter(summary => {
        return summary.year >= this.selectedReport.startYear && summary.year < this.selectedReport.endYear;
      });

      this.selectedFacilitySummaries = this.facilitySummariesWithAnnual.map(summary => ({
        facilitySummary: summary.facilitySummary,
        annualFacilityAnalysisSummaries: summary.annualFacilityAnalysisSummaries.filter(annualSummary => {
          return annualSummary.year >= this.selectedReport.startYear && annualSummary.year < this.selectedReport.endYear;
        })
      }));
    } else {
      this.selectedAnnualAnalysisSummary = this.annualAnalysisSummary.filter(summary => {
        return summary.year >= this.selectedReport.startYear && summary.year <= this.selectedReport.endYear;
      });
      this.selectedFacilitySummaries = this.facilitySummariesWithAnnual.map(summary => ({
        facilitySummary: summary.facilitySummary,
        annualFacilityAnalysisSummaries: summary.annualFacilityAnalysisSummaries.filter(annualSummary => {
          return annualSummary.year >= this.selectedReport.startYear && annualSummary.year <= this.selectedReport.endYear;
        })
      }));
    }
  }

  getSelectedPerformanceSummaries() {
    this.selectedPerformanceReport = JSON.parse(JSON.stringify(this.performanceReport));
    if (this.selectedReport.endMonth != 11) {
      this.selectedPerformanceReport.annualFacilityData = this.performanceReport.annualFacilityData.map(facility => ({
        annualData: facility.annualData.filter(data => {
          return data.year >= this.selectedReport.startYear && data.year < this.selectedReport.endYear;
        }),
        facility: facility.facility,
      }));

      this.selectedPerformanceReport.facilityTotals = this.performanceReport.facilityTotals.filter(data => {
        return data.year >= this.selectedReport.startYear && data.year < this.selectedReport.endYear;
      });
    }
    else {
      this.selectedPerformanceReport.annualFacilityData = this.performanceReport.annualFacilityData.map(facility => ({
        annualData: facility.annualData.filter(data => {
          return data.year >= this.selectedReport.startYear && data.year <= this.selectedReport.endYear;
        }),
        facility: facility.facility,
      }));
      this.selectedPerformanceReport.facilityTotals = this.performanceReport.facilityTotals.filter(data => {
        return data.year >= this.selectedReport.startYear && data.year <= this.selectedReport.endYear;
      });
    }
  }

  ngOnDestroy(): void {
    this.printSub.unsubscribe();
    if (this.workerAnalysis) {
      this.workerAnalysis.terminate();
    }
    if (this.workerPerformance) {
      this.workerPerformance.terminate();
    }
  }
}

