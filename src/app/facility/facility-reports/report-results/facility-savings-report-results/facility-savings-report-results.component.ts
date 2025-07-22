import { Component } from '@angular/core';
import { get } from 'http';
import { Subscription } from 'rxjs';
import { AccountAnalysisService } from 'src/app/account/account-analysis/account-analysis.service';
import { AccountReportsService } from 'src/app/account/account-reports/account-reports.service';
import { AnnualFacilityAnalysisSummaryClass } from 'src/app/calculations/analysis-calculations/annualFacilityAnalysisSummaryClass';
import { getCalanderizedMeterData } from 'src/app/calculations/calanderization/calanderizeMeters';
import { getNeededUnits } from 'src/app/calculations/shared-calculations/calanderizationFunctions';
import { AnalysisService } from 'src/app/facility/analysis/analysis.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { AnalysisGroup, AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';

@Component({
  selector: 'app-facility-savings-report-results',
  standalone: false,

  templateUrl: './facility-savings-report-results.component.html',
  styleUrl: './facility-savings-report-results.component.css'
})
export class FacilitySavingsReportResultsComponent {

  facilityReport: IdbFacilityReport;
  facilityReportSub: Subscription;
  analysisItem: IdbAnalysisItem;
  worker: Worker;
  annualAnalysisSummaries: Array<AnnualAnalysisSummary>;
  annualAnalysisSummariesSelected: Array<AnnualAnalysisSummary>;
  calculating: boolean | 'error' = false;
  facility: IdbFacility;
  annualAnalysisSummarySub: Subscription;
  printSub: Subscription;
  print: boolean;
  monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
  groupSummaries: Array<{
    group: AnalysisGroup,
    monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>,
    annualAnalysisSummaryData: Array<AnnualAnalysisSummary>
  }>;
  selectedGroupSummaries: Array<{
    group: AnalysisGroup,
    monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>,
    annualAnalysisSummaryData: Array<AnnualAnalysisSummary>
  }>;
  itemsPerPage: number;
  itemsPerPageSub: Subscription;
  startDate: Date;
  endDate: Date;
  constructor(
    private facilityDbService: FacilitydbService,
    private predictorDbService: PredictorDbService,
    private predictorDataDbService: PredictorDataDbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private analysisDbService: AnalysisDbService,
    private accountReportsService: AccountReportsService,
    private accountDbService: AccountdbService,
    private sharedDataService: SharedDataService,
    private facilityReportsDbService: FacilityReportsDbService,
  ) { }

  ngOnInit(): void {
    this.facilityReportSub = this.facilityReportsDbService.selectedReport.subscribe(report => {
      this.facilityReport = report;
      this.analysisItem = this.analysisDbService.getByGuid(this.facilityReport.analysisItemId);
    });

    this.printSub = this.accountReportsService.print.subscribe(print => {
      this.print = print;
    });

    this.itemsPerPageSub = this.sharedDataService.itemsPerPage.subscribe(val => {
      this.itemsPerPage = val;
    });

    this.startDate = new Date(this.facilityReport.savingsReportSettings.startYear, this.facilityReport.savingsReportSettings.startMonth, 1);
    this.endDate = new Date(this.facilityReport.savingsReportSettings.endYear, this.facilityReport.savingsReportSettings.endMonth, 1);

    this.getAnnualAnalysisSummary();
  }

  getSelectedSummaries() {
    if (this.facilityReport.savingsReportSettings.endMonth != 11) {
      this.annualAnalysisSummariesSelected = this.annualAnalysisSummaries.filter(summary => {
        return summary.year >= this.facilityReport.savingsReportSettings.startYear && summary.year < this.facilityReport.savingsReportSettings.endYear;
      });

      this.selectedGroupSummaries = this.groupSummaries.map(groupSummary => ({
        ...groupSummary,
        monthlyAnalysisSummaryData: groupSummary.monthlyAnalysisSummaryData.filter(summary => {
          return summary.date >= this.startDate && summary.date <= this.endDate;
        }),
        annualAnalysisSummaryData: groupSummary.annualAnalysisSummaryData.filter(summary => {
          return summary.year >= this.facilityReport.savingsReportSettings.startYear && summary.year < this.facilityReport.savingsReportSettings.endYear;
        })
      }));
    } else {
      this.annualAnalysisSummariesSelected = this.annualAnalysisSummaries.filter(summary => {
        return summary.year >= this.facilityReport.savingsReportSettings.startYear && summary.year <= this.facilityReport.savingsReportSettings.endYear;
      });

      this.selectedGroupSummaries = this.groupSummaries.map(groupSummary => ({
        ...groupSummary,
        monthlyAnalysisSummaryData: groupSummary.monthlyAnalysisSummaryData.filter(summary => {
          return summary.date >= this.startDate && summary.date <= this.endDate;
        }),
        annualAnalysisSummaryData: groupSummary.annualAnalysisSummaryData.filter(summary => {
          return summary.year >= this.facilityReport.savingsReportSettings.startYear && summary.year <= this.facilityReport.savingsReportSettings.endYear;
        })
      }));
    }
  }

  getAnnualAnalysisSummary() {
    let accountAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    this.facility = this.facilityDbService.getFacilityById(this.analysisItem.facilityId);
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.getFacilityMetersByFacilityGuid(this.analysisItem.facilityId);
    let facilityMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getFacilityMeterDataByFacilityGuid(this.analysisItem.facilityId);
    let accountPredictorEntries: Array<IdbPredictorData> = this.predictorDataDbService.getByFacilityId(this.analysisItem.facilityId);
    let accountPredictors: Array<IdbPredictor> = this.predictorDbService.getByFacilityId(this.analysisItem.facilityId);
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('src/app/web-workers/annual-facility-analysis.worker', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        this.worker.terminate();
        if (!data.error) {
          this.annualAnalysisSummaries = data.annualAnalysisSummaries;
          this.monthlyAnalysisSummaryData = data.monthlyAnalysisSummaryData;
          this.groupSummaries = data.groupSummaries;
          this.calculating = false;
          this.getSelectedSummaries();
        } else {
          this.calculating = 'error';
        }
      };
      this.calculating = true;
      const workerMessage = {
        analysisItem: this.analysisItem,
        facility: this.facility,
        meters: facilityMeters,
        meterData: facilityMeterData,
        accountPredictorEntries: accountPredictorEntries,
        calculateAllMonthlyData: false,
        accountPredictors: accountPredictors,
        accountAnalysisItems: accountAnalysisItems,
        includeGroupSummaries: true,
        assessmentReportVersion: account.assessmentReportVersion,
      };
      this.worker.postMessage(workerMessage);
    } else {
      // Web Workers are not supported in this environment.  
      let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(facilityMeters, facilityMeterData, this.facility, false, { energyIsSource: this.analysisItem.energyIsSource, neededUnits: getNeededUnits(this.analysisItem) }, [], [], [this.facility], account.assessmentReportVersion);
      let annualAnalysisSummaryClass: AnnualFacilityAnalysisSummaryClass = new AnnualFacilityAnalysisSummaryClass(this.analysisItem, this.facility, calanderizedMeters, accountPredictorEntries, false, accountPredictors, undefined, true);
      this.annualAnalysisSummaries = annualAnalysisSummaryClass.getAnnualAnalysisSummaries();
      this.monthlyAnalysisSummaryData = annualAnalysisSummaryClass.monthlyAnalysisSummaryData;
      this.groupSummaries = annualAnalysisSummaryClass.groupSummaries;
      this.getSelectedSummaries();
    }
  }

  ngOnDestroy() {
    if (this.worker) {
      this.worker.terminate();
    }
    this.facilityReportSub.unsubscribe();
    this.printSub.unsubscribe();
    this.itemsPerPageSub.unsubscribe();
  }
}
