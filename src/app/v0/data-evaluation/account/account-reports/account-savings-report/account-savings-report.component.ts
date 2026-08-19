import { AccountWorkspaceStore } from '@app/account-workspace/account-workspace.store';
import { Component, QueryList, ViewChild, ViewChildren, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { IdbAccount } from '@app/models/idbModels/account';
import { IdbAccountAnalysisItem } from '@app/models/idbModels/accountAnalysisItem';
import { IdbAccountReport } from '@app/models/idbModels/accountReport';
import { AccountSavingsReportSetup, PerformanceReportSetup } from '@app/models/overview-report';
import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from '@app/models/analysis';
import { IdbAnalysisItem } from '@app/models/idbModels/analysisItem';
import { IdbFacility } from '@app/models/idbModels/facility';
import { IdbPredictor } from '@app/models/idbModels/predictor';
import { IdbPredictorData } from '@app/models/idbModels/predictorData';
import { IdbUtilityMeter } from '@app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@app/models/idbModels/utilityMeterData';
import { PerformanceReport } from '@app/calculations/performance-report-calculations/performanceReport';
import { DataEvaluationService } from '@v0/data-evaluation/data-evaluation.service';
import { AccountSavingsReport } from '@app/calculations/savings-report-calculations/accountSavingsReport';
import { SharedDataService } from '@app/shared/helper-services/shared-data.service';
import { AnalysisService } from '@v0/data-evaluation/facility/analysis/analysis.service';
import { ExportReportPdfService } from '@app/shared/pdf-report/services/export-report-pdf.service';
import { AccountSavingsReportAdapter } from '@v0/data-evaluation/account/account-reports/account-savings-report/account-savings-report.adapter';
import { AnnualAnalysisSummaryGraphComponent } from '@app/shared/shared-analysis/annual-analysis-summary-graph/annual-analysis-summary-graph.component';
import { MonthlyAnalysisSummaryGraphComponent } from '@app/shared/shared-analysis/monthly-analysis-summary-graph/monthly-analysis-summary-graph.component';
import { MonthlyAnalysisSummarySavingsGraphComponent } from '@app/shared/shared-analysis/monthly-analysis-summary-savings-graph/monthly-analysis-summary-savings-graph.component';
import { PerformanceChartComponent } from '@v0/data-evaluation/account/account-reports/performance-report/performance-chart/performance-chart.component';
import { PptReportService } from '@app/shared/ppt-report/ppt-report.service';
import { AccountSavingsReportPptAdapter } from '@v0/data-evaluation/account/account-reports/account-savings-report/account-savings-report-ppt.adapter';

@Component({
  selector: 'app-account-savings-report',
  standalone: false,

  templateUrl: './account-savings-report.component.html',
  styleUrl: './account-savings-report.component.css'
})
export class AccountSavingsReportComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
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

  isExportingPdf: boolean = false;

  @ViewChild(AnnualAnalysisSummaryGraphComponent) annualAnalysisSummaryGraphComponent?: AnnualAnalysisSummaryGraphComponent;
  @ViewChild('monthlyAnalysisGraph') monthlyAnalysisGraphComponent?: MonthlyAnalysisSummaryGraphComponent;
  @ViewChild('monthlyAnalysisSavingsGraph') monthlyAnalysisSavingsGraphComponent?: MonthlyAnalysisSummarySavingsGraphComponent;
  @ViewChildren('facilityAnnualGraph') facilityAnnualGraphs!: QueryList<AnnualAnalysisSummaryGraphComponent>;
  @ViewChildren('facilityMonthlyGraph') facilityMonthlyGraphs!: QueryList<MonthlyAnalysisSummaryGraphComponent>;
  @ViewChildren('facilityMonthlySavingsGraph') facilityMonthlySavingsGraphs!: QueryList<MonthlyAnalysisSummarySavingsGraphComponent>;
  @ViewChild('performanceChart') performanceChartComponent?: PerformanceChartComponent;

  constructor(
    private router: Router,
    private sharedDataService: SharedDataService,
    private analysisService: AnalysisService,
    private dataEvaluationService: DataEvaluationService,
    private accountSavingsReportAdapter: AccountSavingsReportAdapter,
    private exportReportPdfService: ExportReportPdfService,
    private pptReportService: PptReportService,
    private accountSavingsReportPPTAdapter: AccountSavingsReportPptAdapter

  ) { }

  ngOnInit(): void {
    this.printSub = this.dataEvaluationService.print.subscribe(print => {
      this.print = print;
    });
    this.itemsPerPageSub = this.sharedDataService.itemsPerPage.subscribe(val => {
      this.itemsPerPage = val;
    });
    this.selectedReport = this.accountWorkspaceStore.selectedAccountReport();
    this.analysisService.analysisTableColumns.next(this.selectedReport.accountSavingsReportSetup.analysisTableColumns);
    if (!this.selectedReport) {
      this.router.navigateByUrl('/account/reports/dashboard');
    } else {
      this.accountSavingsReportSetup = this.selectedReport.accountSavingsReportSetup;
    }
    this.account = this.accountWorkspaceStore.account();
    this.accountAnalysisItems = [...this.accountWorkspaceStore.accountAnalyses()];
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
      this.worker = new Worker(new URL('../../../../web-workers/account-savings-report.worker', import.meta.url));
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

  async onExportPdf() {
    let selectedReport = this.accountWorkspaceStore.selectedAccountReport();
    if (!selectedReport || this.isExportingPdf) {
      return;
    }

    this.isExportingPdf = true;
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      const document = this.accountSavingsReportAdapter.buildDocument({
        account: this.account,
        report: selectedReport,
        savingsReport: this.accountSavingsReportSetup,
        annualAnalysisSummaries: this.annualAnalysisSummaries,
        latestMonthSummary: this.latestMonthSummary,
        monthlyAnalysisSummaryData: this.monthlyAnalysisSummaryData,
        facilitySummaries: this.facilitySummaries,
        analysisItem: this.selectedAnalysisItem,
        performanceReport: this.performanceReport,
        performanceSetupDetails: this.setupDetails,
        chartImageProviders: this.getChartImageProviders()
      });
      await this.exportReportPdfService.export(document, `${selectedReport.name} - Account Savings Report`);
    } finally {
      this.isExportingPdf = false;
    }
  }

  getChartImageProviders() {
    return {
      annualEnergyIntensityChart: this.annualAnalysisSummaryGraphComponent ? () => this.annualAnalysisSummaryGraphComponent.getEnergyIntensityChartAsBase64Image() : async () => '',
      annualPercentImprovementChart: this.annualAnalysisSummaryGraphComponent ? () => this.annualAnalysisSummaryGraphComponent.getPercentImprovementChartAsBase64Image() : async () => '',
      monthlyAnalysisGraph: this.monthlyAnalysisGraphComponent ? () => this.monthlyAnalysisGraphComponent.getChartAsBase64Image() : async () => '',
      monthlyAnalysisSavingsGraph: this.monthlyAnalysisSavingsGraphComponent ? () => this.monthlyAnalysisSavingsGraphComponent.getChartAsBase64Image() : async () => '',
      facilityEnergyIntensityChart: this.getFacilityEnergyIntensityCharts(),
      facilityPercentImprovementChart: this.getFacilityPercentImprovementCharts(),
      facilityMonthlyAnalysisGraph: this.getFacilityMonthlyAnalysisCharts(),
      facilityMonthlyAnalysisSavingsGraph: this.getFacilityMonthlySavingsCharts(),
      performanceChart: this.performanceChartComponent ? () => this.performanceChartComponent.getChartAsBase64Image() : async () => ''
    };
  }

  getFacilityEnergyIntensityCharts(): Record<string, () => Promise<string>> {
    const charts: Record<string, () => Promise<string>> = {};
    this.facilityAnnualGraphs.forEach((graph, index) => {
      const facilityId = this.facilitySummaries[index].facility.guid;
      charts[facilityId] = async () => graph.getEnergyIntensityChartAsBase64Image();
    });
    return charts;
  }

  getFacilityPercentImprovementCharts(): Record<string, () => Promise<string>> {
    const charts: Record<string, () => Promise<string>> = {};
    this.facilityAnnualGraphs.forEach((graph, index) => {
      const facilityId = this.facilitySummaries[index].facility.guid;
      charts[facilityId] = async () => graph.getPercentImprovementChartAsBase64Image();
    });
    return charts;
  }

  getFacilityMonthlyAnalysisCharts(): Record<string, () => Promise<string>> {
    const charts: Record<string, () => Promise<string>> = {};
    this.facilityMonthlyGraphs.forEach((graph, index) => {
      const facilityId = this.facilitySummaries[index].facility.guid;
      charts[facilityId] = async () => graph.getChartAsBase64Image();
    });
    return charts;
  }

  getFacilityMonthlySavingsCharts(): Record<string, () => Promise<string>> {
    const charts: Record<string, () => Promise<string>> = {};
    this.facilityMonthlySavingsGraphs.forEach((graph, index) => {
      const facilityId = this.facilitySummaries[index].facility.guid;
      charts[facilityId] = async () => graph.getChartAsBase64Image();
    });
    return charts;
  }

  async downloadPpt(): Promise<void> {
    const document = this.accountSavingsReportPPTAdapter.buildDocument({
      report: this.selectedReport,
      account: this.account,
      analysisItem: this.selectedAnalysisItem,
      setup: this.accountSavingsReportSetup,
      annualAnalysisSummaries: this.annualAnalysisSummaries,
      monthlyAnalysisSummaryData: this.monthlyAnalysisSummaryData,
      facilitySummaries: this.facilitySummaries,
      lastMonthSummary: this.latestMonthSummary,
      performanceReport: this.performanceReport,
      analysisTableColumns: this.analysisService.analysisTableColumns.getValue()
    });
    await this.pptReportService.buildPowerpoint(document, `Savings Report - ${this.selectedReport.name}.pptx`);
  }
}
