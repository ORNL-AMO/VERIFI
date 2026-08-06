import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceQueryService } from 'src/app/account-workspace/account-workspace-query.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, ViewChild, inject, Injector } from '@angular/core';
import { Subscription } from 'rxjs';
import { AnalysisService } from 'src/app/data-evaluation/facility/analysis/analysis.service';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';
import { FacilityAnalysisReportAdapter } from './facility-analysis-report.adapter';
import { ExportReportPdfService } from 'src/app/shared/pdf-report/services/export-report-pdf.service';
import { AnalysisGroup, AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { FacilityAnalysisReportComponent } from 'src/app/shared/shared-reports/facility-analysis-report/facility-analysis-report.component';

@Component({
  selector: 'app-facility-analysis-report-results',
  templateUrl: './facility-analysis-report-results.component.html',
  styleUrl: './facility-analysis-report-results.component.css',
  standalone: false
})
export class FacilityAnalysisReportResultsComponent {
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  facilityReport: IdbFacilityReport;
  facilityReportSub: Subscription;

  analysisItem: IdbAnalysisItem;
  analysisSummaryData: AnalysisData;
  isExportingPdf: boolean = false;

  @ViewChild(FacilityAnalysisReportComponent) facilityAnalysisReportComponent?: FacilityAnalysisReportComponent;

  constructor(
    private analysisService: AnalysisService,
    private facilityAnalysisReportAdapter: FacilityAnalysisReportAdapter,
    private exportReportPdfService: ExportReportPdfService,
    private injector: Injector
  ) {
  }

  ngOnInit() {
    this.facilityReportSub = toObservable(this.accountWorkspaceStore.selectedFacilityReport, { injector: this.injector }).subscribe(report => {
      this.facilityReport = report;
      this.analysisItem = this.accountWorkspaceQuery.getFacilityAnalysisByGuid(this.facilityReport.analysisItemId);
      this.analysisService.analysisTableColumns.next(this.facilityReport.analysisReportSettings.analysisTableColumns);
    });
  }

  ngOnDestroy() {
    this.facilityReportSub.unsubscribe();
  }

  setAnalysisData(data: AnalysisData) {
    this.analysisSummaryData = data;
  }

  async onExportPdf() {
    if (!this.facilityReport || !this.analysisSummaryData || this.isExportingPdf) {
      return;
    }

    this.isExportingPdf = true;
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      const document = this.facilityAnalysisReportAdapter.buildDocument({
        facilityReport: this.facilityReport,
        facility: this.analysisSummaryData.facility,
        analysisItem: this.analysisItem,
        annualAnalysisSummaries: this.analysisSummaryData.annualAnalysisSummaries,
        monthlyAnalysisSummaryData: this.analysisSummaryData.monthlyAnalysisSummaryData,
        groupSummaries: this.analysisSummaryData.groupSummaries,
        chartImageProviders: this.getChartImageProviders()
      });

      await this.exportReportPdfService.export(document, `${this.facilityReport.name} - Analysis Report`);
    } finally {
      this.isExportingPdf = false;
    }
  }

  getChartImageProviders() {
    return {
      annualEnergyIntensityChart:
        this.facilityAnalysisReportComponent?.getEnergyIntensityChartProvider() ??
        (async () => ''),
      annualPercentImprovementChart:
        this.facilityAnalysisReportComponent?.getPercentImprovementChartProvider() ??
        (async () => ''),
      monthlyAnalysisGraph:
        this.facilityAnalysisReportComponent?.getMonthlyAnalysisGraphProvider() ??
        (async () => ''),
      monthlyAnalysisSavingsGraph:
        this.facilityAnalysisReportComponent?.getMonthlyAnalysisSavingsGraphProvider() ??
        (async () => ''),
      groupModelGraph:
        this.facilityAnalysisReportComponent?.getGroupModelGraphProvider() ??
        {},
      groupAnnualEnergyIntensityChart:
        this.facilityAnalysisReportComponent?.getGroupAnnualEnergyIntensityChartProvider() ??
        {},
      groupAnnualPercentImprovementChart:
        this.facilityAnalysisReportComponent?.getGroupAnnualPercentImprovementChartProvider() ??
        {},
      groupMonthlyAnalysisGraph:
        this.facilityAnalysisReportComponent?.getGroupMonthlyAnalysisGraphProvider() ??
        {},
      groupMonthlyAnalysisSavingsGraph:
        this.facilityAnalysisReportComponent?.getGroupMonthlyAnalysisSavingsGraphProvider() ??
        {},
    };
  }
}

export interface AnalysisData {
  facility: IdbFacility;
  annualAnalysisSummaries: Array<AnnualAnalysisSummary>;
  monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
  groupSummaries: Array<{
    group: AnalysisGroup,
    monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>,
    annualAnalysisSummaryData: Array<AnnualAnalysisSummary>
  }>;
}
