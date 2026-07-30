import { Component, Input, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { DataEvaluationService } from 'src/app/data-evaluation/data-evaluation.service';
import { AnalysisGroupItem, AnalysisService } from 'src/app/data-evaluation/facility/analysis/analysis.service';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { AnalysisGroup, AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { AnalysisReportSettings, IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';
import { RegressionModelDetailsComponent } from './regression-model-details/regression-model-details.component';
import { GroupAnnualAnalysisReportComponent } from './group-annual-analysis-report/group-annual-analysis-report.component';
import { GroupMonthlyAnalysisReportComponent } from './group-monthly-analysis-report/group-monthly-analysis-report.component';

@Component({
  selector: 'app-group-analysis-report',
  templateUrl: './group-analysis-report.component.html',
  styleUrl: './group-analysis-report.component.css',
  standalone: false
})
export class GroupAnalysisReportComponent {
  @Input({ required: true })
  analysisItem: IdbAnalysisItem;
  @Input({ required: true })
  facility: IdbFacility;
  @Input({ required: true })
  groupSummary: {
    group: AnalysisGroup,
    monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>,
    annualAnalysisSummaryData: Array<AnnualAnalysisSummary>
  };
  @Input({ required: true })
  analysisReportSettings: AnalysisReportSettings;
  @Input({ required: true })
  reportYear: number;
  @Input()
  isFirstGroup: boolean = false;

  groupItem: AnalysisGroupItem;
  print: boolean;
  printSub: Subscription;
  facilityReport: IdbFacilityReport;
  facilityReportSub: Subscription;

  @ViewChild('modelGroupGraph') modelGroupGraph?: RegressionModelDetailsComponent;
  @ViewChild(GroupAnnualAnalysisReportComponent) groupAnnualAnalysisReportComponent?: GroupAnnualAnalysisReportComponent;
  @ViewChild(GroupMonthlyAnalysisReportComponent) groupMonthlyAnalysisReportComponent?: GroupMonthlyAnalysisReportComponent;

  constructor(private analysisService: AnalysisService, private dataEvaluationService: DataEvaluationService,
    private facilityReportsDbService: FacilityReportsDbService
  ) {
  }

  ngOnInit() {
    this.groupItem = this.analysisService.getGroupItem(this.groupSummary.group);
    this.printSub = this.dataEvaluationService.print.subscribe(print => {
      this.print = print;
    })
    this.facilityReportSub = this.facilityReportsDbService.selectedReport.subscribe(report => {
      this.facilityReport = report;
    });
  }

  ngOnDestroy() {
    this.printSub.unsubscribe();
    this.facilityReportSub.unsubscribe();
  }

  getGroupId() {
    return this.groupSummary.group.idbGroupId;
  }

  async getGroupGraphImage(): Promise<string> {
    if (this.modelGroupGraph) {
      return await this.modelGroupGraph.getChartAsBase64Image();
    }
    return '';
  }

  async getGroupAnnualEnergyIntensityChart(): Promise<string> {
    if (this.groupAnnualAnalysisReportComponent) {
      return await this.groupAnnualAnalysisReportComponent.getEnergyIntensityChart();
    }
    return '';
  }

  async getGroupAnnualPercentImprovementChart(): Promise<string> {
    if (this.groupAnnualAnalysisReportComponent) {
      return await this.groupAnnualAnalysisReportComponent.getPercentImprovementChart();
    }
    return '';
  }

  async getGroupMonthlyAnalysisGraph(): Promise<string> {
    if (this.groupMonthlyAnalysisReportComponent) {
      return await this.groupMonthlyAnalysisReportComponent.getMonthlyAnalysisGraph();
    }
    return '';
  }

  async getGroupMonthlyAnalysisSavingsGraph(): Promise<string> {
    if (this.groupMonthlyAnalysisReportComponent) {
      return await this.groupMonthlyAnalysisReportComponent.getMonthlyAnalysisSavingsGraph();
    }
    return '';
  }
}
