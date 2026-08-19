import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { Component, Input, ViewChild, inject, Injector } from '@angular/core';
import { Subscription } from 'rxjs';
import { DataEvaluationService } from '@v0/data-evaluation/data-evaluation.service';
import { AnalysisGroupItem, AnalysisService } from '@v0/data-evaluation/facility/analysis/analysis.service';
import { AnalysisGroup, AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbFacility } from '@data/models/idbModels/facility';
import { AnalysisReportSettings, IdbFacilityReport } from '@data/models/idbModels/facilityReport';
import { RegressionModelDetailsComponent } from '@v0/shared/shared-reports/facility-analysis-report/group-analysis-report/regression-model-details/regression-model-details.component';
import { GroupAnnualAnalysisReportComponent } from '@v0/shared/shared-reports/facility-analysis-report/group-analysis-report/group-annual-analysis-report/group-annual-analysis-report.component';
import { GroupMonthlyAnalysisReportComponent } from '@v0/shared/shared-reports/facility-analysis-report/group-analysis-report/group-monthly-analysis-report/group-monthly-analysis-report.component';

@Component({
  selector: 'app-group-analysis-report',
  templateUrl: './group-analysis-report.component.html',
  styleUrl: './group-analysis-report.component.css',
  standalone: false
})
export class GroupAnalysisReportComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
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

  constructor(
    private analysisService: AnalysisService,
    private dataEvaluationService: DataEvaluationService,
    private injector: Injector

  ) {
  }

  ngOnInit() {
    this.groupItem = this.analysisService.getGroupItem(this.groupSummary.group);
    this.printSub = this.dataEvaluationService.print.subscribe(print => {
      this.print = print;
    })
    this.facilityReportSub = toObservable(this.accountWorkspaceStore.selectedFacilityReport, { injector: this.injector }).subscribe(report => {
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
