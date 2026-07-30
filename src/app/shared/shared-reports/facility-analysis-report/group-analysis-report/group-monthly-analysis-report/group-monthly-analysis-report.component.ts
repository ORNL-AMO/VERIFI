import { Component, Input, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { DataEvaluationService } from 'src/app/data-evaluation/data-evaluation.service';
import { AnalysisGroup, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { AnalysisReportSettings } from 'src/app/models/idbModels/facilityReport';
import { MonthlyAnalysisSummaryGraphComponent } from 'src/app/shared/shared-analysis/monthly-analysis-summary-graph/monthly-analysis-summary-graph.component';
import { MonthlyAnalysisSummarySavingsGraphComponent } from 'src/app/shared/shared-analysis/monthly-analysis-summary-savings-graph/monthly-analysis-summary-savings-graph.component';

@Component({
    selector: 'app-group-monthly-analysis-report',
    templateUrl: './group-monthly-analysis-report.component.html',
    styleUrl: './group-monthly-analysis-report.component.css',
    standalone: false
})
export class GroupMonthlyAnalysisReportComponent {
  @Input({ required: true })
  analysisItem: IdbAnalysisItem;
  @Input({ required: true })
  monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
  @Input({ required: true })
  facility: IdbFacility;
  @Input({ required: true })
  analysisReportSettings: AnalysisReportSettings;
  @Input({ required: true })
  reportYear: number;
  @Input({required: true})
  group: AnalysisGroup;


  baselineYearAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
  reportYearAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
  modelYearAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
  modelYearIsBaselineYear: boolean = false;
  modelYearIsReportYear: boolean = false;
  print: boolean;
  printSub: Subscription;

  @ViewChild(MonthlyAnalysisSummaryGraphComponent) monthlyAnalysisSummaryGraphComponent ?: MonthlyAnalysisSummaryGraphComponent;
  @ViewChild(MonthlyAnalysisSummarySavingsGraphComponent) monthlyAnalysisSummarySavingsGraphComponent ?: MonthlyAnalysisSummarySavingsGraphComponent;
  
  constructor(private dataEvaluationService: DataEvaluationService) {

  }

  ngOnInit() {
    this.printSub = this.dataEvaluationService.print.subscribe(print => {
      this.print = print;
    });
    this.setBaselineYearMonthlyData();
    this.setReportYearMonthlyData();
    this.setModelYearMonthlyData();
  }

  ngOnDestroy() {
    this.printSub.unsubscribe();
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

  setModelYearMonthlyData() {
    if (this.group.analysisType == 'regression') {
      this.modelYearIsBaselineYear = this.group.regressionModelYear == this.analysisItem.baselineYear;
      this.modelYearIsReportYear = this.group.regressionModelYear == this.reportYear;
      if (!this.modelYearIsBaselineYear && !this.modelYearIsReportYear) {
        this.modelYearAnalysisSummaryData = this.monthlyAnalysisSummaryData.filter(summaryData => {
          return summaryData.fiscalYear == this.group.regressionModelYear;
        });
      }
    }
  }

  async getMonthlyAnalysisGraph(): Promise<string> {
    if (this.monthlyAnalysisSummaryGraphComponent) {
      return await this.monthlyAnalysisSummaryGraphComponent.getChartAsBase64Image();
    }
    return '';
  }

  async getMonthlyAnalysisSavingsGraph(): Promise<string> {
    if (this.monthlyAnalysisSummarySavingsGraphComponent) {
      return await this.monthlyAnalysisSummarySavingsGraphComponent.getChartAsBase64Image();
    }
    return '';
  }
}
