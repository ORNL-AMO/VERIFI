import { Component, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { Subscription } from 'rxjs';
import { getCalanderizedMeterData } from 'src/app/calculations/calanderization/calanderizeMeters';
import { FacilitySavingsReport } from 'src/app/calculations/savings-report-calculations/facilitySavingsReport';
import { getNeededUnits } from 'src/app/calculations/shared-calculations/calanderizationFunctions';
import { DataEvaluationService } from 'src/app/data-evaluation/data-evaluation.service';
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
import { AnalysisService } from '../../../analysis/analysis.service';
import { ExportReportPdfService } from 'src/app/shared/pdf-report/services/export-report-pdf.service';
import { FacilitySavingsReportAdapter } from './facility-savings-report.adapter';
import { MonthlyAnalysisSummarySavingsGraphComponent } from 'src/app/shared/shared-analysis/monthly-analysis-summary-savings-graph/monthly-analysis-summary-savings-graph.component';
import { MonthlyAnalysisSummaryGraphComponent } from 'src/app/shared/shared-analysis/monthly-analysis-summary-graph/monthly-analysis-summary-graph.component';
import { RollingEnergyConsumptionGraphComponent } from 'src/app/shared/shared-reports/facility-savings-report/rolling-energy-consumption-graph/rolling-energy-consumption-graph.component';
import { RollingEnergySavingsGraphComponent } from 'src/app/shared/shared-reports/facility-savings-report/rolling-energy-savings-graph/rolling-energy-savings-graph.component';

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
  calculating: boolean | 'error' = false;
  facility: IdbFacility;
  annualAnalysisSummarySub: Subscription;
  printSub: Subscription;
  print: boolean;
  monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
  groupSummaries: Array<{
    group: AnalysisGroup,
    monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>,
    annualAnalysisSummaryData: Array<AnnualAnalysisSummary>,
    latestMonthGroupSummary: MonthlyAnalysisSummaryData
  }>;
  itemsPerPage: number;
  itemsPerPageSub: Subscription;
  endDate: Date;
  latestMonthSummary: MonthlyAnalysisSummaryData;

  isExportingPdf: boolean = false;
  @ViewChild('monthlyAnalysisGraph') monthlyAnalysisGraph?: MonthlyAnalysisSummaryGraphComponent;
  @ViewChild('monthlyAnalysisSavingsGraph') monthlyAnalysisSavingsGraph?: MonthlyAnalysisSummarySavingsGraphComponent;
  @ViewChild('trailing12MonthConsumptionGraph') trailing12MonthConsumptionGraph?: RollingEnergyConsumptionGraphComponent;
  @ViewChild('trailing12MonthSavingsGraph') trailing12MonthSavingsGraph?: RollingEnergySavingsGraphComponent;
  @ViewChildren('groupMonthlyAnalysisGraph') groupMonthlyAnalysisGraphs?: QueryList<MonthlyAnalysisSummaryGraphComponent>;
  @ViewChildren('groupMonthlyAnalysisSavingsGraph') groupMonthlyAnalysisSavingsGraphs?: QueryList<MonthlyAnalysisSummarySavingsGraphComponent>;
  @ViewChildren('groupTrailing12MonthConsumptionGraph') groupTrailing12MonthConsumptionGraphs?: QueryList<RollingEnergyConsumptionGraphComponent>;
  @ViewChildren('groupTrailing12MonthSavingsGraph') groupTrailing12MonthSavingsGraphs?: QueryList<RollingEnergySavingsGraphComponent>;

  constructor(
    private facilityDbService: FacilitydbService,
    private predictorDbService: PredictorDbService,
    private predictorDataDbService: PredictorDataDbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private analysisDbService: AnalysisDbService,
    private accountDbService: AccountdbService,
    private sharedDataService: SharedDataService,
    private facilityReportsDbService: FacilityReportsDbService,
    private analysisService: AnalysisService,
    private dataEvaluationService: DataEvaluationService,
    private exportReportPdfService: ExportReportPdfService,
    private facilitySavingsReportAdapter: FacilitySavingsReportAdapter
  ) { }

  ngOnInit(): void {
    this.facilityReportSub = this.facilityReportsDbService.selectedReport.subscribe(report => {
      this.facilityReport = report;
      this.analysisItem = this.analysisDbService.getByGuid(this.facilityReport.analysisItemId);
      this.analysisService.analysisTableColumns.next(this.facilityReport.savingsReportSettings.analysisTableColumns);
    });

    this.printSub = this.dataEvaluationService.print.subscribe(print => {
      this.print = print;
    });

    this.itemsPerPageSub = this.sharedDataService.itemsPerPage.subscribe(val => {
      this.itemsPerPage = val;
    });

    this.endDate = new Date(this.facilityReport.savingsReportSettings.endYear, this.facilityReport.savingsReportSettings.endMonth, 1);

    this.getAnnualAnalysisSummary();
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
      this.worker = new Worker(new URL('../../../../../web-workers/facility-savings-report.worker', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        this.worker.terminate();
        if (!data.error) {
          this.annualAnalysisSummaries = data.annualAnalysisSummaries;
          this.monthlyAnalysisSummaryData = data.monthlyAnalysisSummaryData;
          this.groupSummaries = data.groupSummaries;
          this.latestMonthSummary = data.latestMonthSummary;
          this.calculating = false;
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
        report: this.facilityReport
      };
      this.worker.postMessage(workerMessage);
    } else {
      // Web Workers are not supported in this environment.  
      let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(facilityMeters, facilityMeterData, this.facility, false, { energyIsSource: this.analysisItem.energyIsSource, neededUnits: getNeededUnits(this.analysisItem) }, [], [], [this.facility], account.assessmentReportVersion, []);
      let facilitySavingsReport: FacilitySavingsReport = new FacilitySavingsReport(this.analysisItem, this.facility, calanderizedMeters, accountPredictorEntries, accountPredictors, this.facilityReport);
      this.annualAnalysisSummaries = facilitySavingsReport.annualAnalysisSummaries;
      this.monthlyAnalysisSummaryData = facilitySavingsReport.monthlyAnalysisSummaryData;
      this.groupSummaries = facilitySavingsReport.groupSummaries;
      this.latestMonthSummary = facilitySavingsReport.latestMonthSummary;
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

  async onExportPdf() {
    if (!this.facilityReport || this.isExportingPdf) {
      return;
    }

    this.isExportingPdf = true;
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      const document = this.facilitySavingsReportAdapter.buildDocument({
        facilityReport: this.facilityReport,
        facility: this.facility,
        analysisItem: this.analysisItem,
        annualAnalysisSummaries: this.annualAnalysisSummaries,
        monthlyAnalysisSummaryData: this.monthlyAnalysisSummaryData,
        groupSummaries: this.groupSummaries,
        latestMonthSummary: this.latestMonthSummary,
        chartImageProviders: this.getChartImageProviders()
      });

      await this.exportReportPdfService.export(document, `${this.facilityReport.name} - Savings Report`);
    } finally {
      this.isExportingPdf = false;
    }
  }

  getChartImageProviders() {
    return {
      monthlyAnalysisGraph: async () => this.monthlyAnalysisGraph?.getChartAsBase64Image() ?? '',
      monthlyAnalysisSavingsGraph: async () => this.monthlyAnalysisSavingsGraph?.getChartAsBase64Image() ?? '',
      trailing12MonthConsumptionGraph: async () => this.trailing12MonthConsumptionGraph?.getChartAsBase64Image() ?? '',
      trailing12MonthSavingsGraph: async () => this.trailing12MonthSavingsGraph?.getChartAsBase64Image() ?? '',
      groupMonthlyAnalysisGraph: this.getGroupMonthlyAnalysisGraphProvider(),
      groupMonthlyAnalysisSavingsGraph: this.getGroupMonthlyAnalysisSavingsGraphProvider(),
      groupTrailing12MonthConsumptionGraph: this.getTrailing12MonthConsumptionGraphImageProvider(),
      groupTrailing12MonthSavingsGraph: this.getTrailing12MonthSavingsGraphImageProvider()
    };
  }

  getGroupMonthlyAnalysisGraphProvider(): Record<string, () => Promise<string>> {
    const providers: Record<string, () => Promise<string>> = {};
    if (this.groupMonthlyAnalysisGraphs) {
      this.groupMonthlyAnalysisGraphs.forEach((graphComponent, index) => {
        const groupId = this.groupSummaries[index].group.idbGroupId;
        providers[groupId] = async () => graphComponent.getChartAsBase64Image();
      });
    }
    return providers;
  }

  getGroupMonthlyAnalysisSavingsGraphProvider(): Record<string, () => Promise<string>> {
    const providers: Record<string, () => Promise<string>> = {};
    if (this.groupMonthlyAnalysisSavingsGraphs) {
      this.groupMonthlyAnalysisSavingsGraphs.forEach((graphComponent, index) => {
        const groupId = this.groupSummaries[index].group.idbGroupId;
        providers[groupId] = async () => graphComponent.getChartAsBase64Image();
      });
    }
    return providers;
  }

  getTrailing12MonthConsumptionGraphImageProvider(): Record<string, () => Promise<string>> {
    const providers: Record<string, () => Promise<string>> = {};
    if (this.groupTrailing12MonthConsumptionGraphs) {
      this.groupTrailing12MonthConsumptionGraphs.forEach((graphComponent, index) => {
        const groupId = this.groupSummaries[index].group.idbGroupId;
        providers[groupId] = async () => graphComponent.getChartAsBase64Image();
      });
    }
    return providers;
  }

  getTrailing12MonthSavingsGraphImageProvider(): Record<string, () => Promise<string>> {
    const providers: Record<string, () => Promise<string>> = {};
    if (this.groupTrailing12MonthSavingsGraphs) {
      this.groupTrailing12MonthSavingsGraphs.forEach((graphComponent, index) => {
        const groupId = this.groupSummaries[index].group.idbGroupId;
        providers[groupId] = async () => graphComponent.getChartAsBase64Image();
      });
    }
    return providers;
  }
}
