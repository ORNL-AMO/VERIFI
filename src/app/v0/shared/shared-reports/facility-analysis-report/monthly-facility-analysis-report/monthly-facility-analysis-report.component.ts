import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { Component, Input, ViewChild, inject, Injector } from '@angular/core';
import { Subscription } from 'rxjs';
import { DataEvaluationService } from '@v0/data-evaluation/data-evaluation.service';
import { AnalysisGroup, AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbFacility } from '@data/models/idbModels/facility';
import { AnalysisReportSettings, IdbFacilityReport } from '@data/models/idbModels/facilityReport';
import { MonthlyAnalysisSummaryGraphComponent } from '@shared/shared-analysis/monthly-analysis-summary-graph/monthly-analysis-summary-graph.component';
import { MonthlyAnalysisSummarySavingsGraphComponent } from '@shared/shared-analysis/monthly-analysis-summary-savings-graph/monthly-analysis-summary-savings-graph.component';

@Component({
  selector: 'app-monthly-facility-analysis-report',
  templateUrl: './monthly-facility-analysis-report.component.html',
  styleUrl: './monthly-facility-analysis-report.component.css',
  standalone: false
})
export class MonthlyFacilityAnalysisReportComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  @Input({ required: true })
  facility: IdbFacility;
  @Input({ required: true })
  analysisItem: IdbAnalysisItem;
  @Input({ required: true })
  monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
  @Input({ required: true })
  analysisReportSettings: AnalysisReportSettings;
  @Input({ required: true })
  reportYear: number;
  @Input()
  groupSummaries: Array<{
    group: AnalysisGroup,
    monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>,
    annualAnalysisSummaryData: Array<AnnualAnalysisSummary>
  }>;
  facilityReport: IdbFacilityReport;
  facilityReportSub: Subscription;
  baselineYearAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
  reportYearAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
  print: boolean;
  printSub: Subscription;

  @ViewChild('monthlyAnalysisGraph') monthlyAnalysisGraph ?: MonthlyAnalysisSummaryGraphComponent;
  @ViewChild('monthlyAnalysisSavingsGraph') monthlyAnalysisSavingsGraph ?: MonthlyAnalysisSummarySavingsGraphComponent;

  constructor(
    private dataEvaluationService: DataEvaluationService,
    private injector: Injector

  ) { }

  ngOnInit() {
    this.facilityReportSub = toObservable(this.accountWorkspaceStore.selectedFacilityReport, { injector: this.injector }).subscribe(report => {
      this.facilityReport = report;
    });
    this.printSub = this.dataEvaluationService.print.subscribe(print => {
      this.print = print;
    });
    this.setBaselineYearMonthlyData();
    this.setReportYearMonthlyData();
  }

  ngOnDestroy() {
    this.printSub.unsubscribe();
    this.facilityReportSub.unsubscribe();
  }


  setBaselineYearMonthlyData() {
    this.baselineYearAnalysisSummaryData = this.monthlyAnalysisSummaryData.filter(summaryData => {
      return summaryData.fiscalYear == this.analysisItem.baselineYear;
    })
  }

  setReportYearMonthlyData() {
    this.reportYearAnalysisSummaryData = this.monthlyAnalysisSummaryData.filter(summaryData => {
      return summaryData.fiscalYear == this.reportYear;
    });
  }

  async getMonthlyAnalysisGraph() : Promise<string> {
    if (this.monthlyAnalysisGraph) {
      return await this.monthlyAnalysisGraph.getChartAsBase64Image();
    }
    return '';
  }

  async getMonthlyAnalysisSavingsGraph() : Promise<string> {
    if (this.monthlyAnalysisSavingsGraph) {
      return await this.monthlyAnalysisSavingsGraph.getChartAsBase64Image();
    }
    return '';
  }
}
