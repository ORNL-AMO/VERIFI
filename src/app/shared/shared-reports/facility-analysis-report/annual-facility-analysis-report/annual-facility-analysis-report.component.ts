import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { Component, Input, ViewChild, inject, Injector } from '@angular/core';
import { Subscription } from 'rxjs';
import { DataEvaluationService } from '@v0/data-evaluation/data-evaluation.service';
import { AnalysisGroup, AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbFacility } from '@data/models/idbModels/facility';
import { AnalysisReportSettings, IdbFacilityReport } from '@data/models/idbModels/facilityReport';
import { AnnualAnalysisSummaryGraphComponent } from 'src/app/shared/shared-analysis/annual-analysis-summary-graph/annual-analysis-summary-graph.component';

@Component({
  selector: 'app-annual-facility-analysis-report',
  templateUrl: './annual-facility-analysis-report.component.html',
  styleUrl: './annual-facility-analysis-report.component.css',
  standalone: false
})
export class AnnualFacilityAnalysisReportComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  @Input({ required: true })
  analysisItem: IdbAnalysisItem;
  @Input({ required: true })
  annualAnalysisSummaries: Array<AnnualAnalysisSummary>;
  @Input({ required: true })
  facility: IdbFacility;
  @Input({ required: true })
  analysisReportSettings: AnalysisReportSettings;
  @Input()
  groupSummaries: Array<{
    group: AnalysisGroup,
    monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>,
    annualAnalysisSummaryData: Array<AnnualAnalysisSummary>
  }>;

  facilityReport: IdbFacilityReport;
  print: boolean;
  printSub: Subscription;
  facilityReportSub: Subscription;

  @ViewChild('annualAnalysisSummaryGraph') annualAnalysisSummaryGraph ?: AnnualAnalysisSummaryGraphComponent;

  constructor(
    private dataEvaluationService: DataEvaluationService,
    private injector: Injector

  ) { }

  ngOnInit() {
    this.printSub = this.dataEvaluationService.print.subscribe(print => {
      this.print = print;
    });

    this.facilityReportSub = toObservable(this.accountWorkspaceStore.selectedFacilityReport, { injector: this.injector }).subscribe(report => {
      this.facilityReport = report;
    });
  }

  ngOnDestroy() {
    this.printSub.unsubscribe();
    this.facilityReportSub.unsubscribe();
  }

  async getEnergyIntensityChart(): Promise<string> {
    if (this.annualAnalysisSummaryGraph) {
      return await this.annualAnalysisSummaryGraph.getEnergyIntensityChartAsBase64Image();
    }
    return '';
  }

  async getPercentImprovementChart(): Promise<string> {
    if (this.annualAnalysisSummaryGraph) {
      return await this.annualAnalysisSummaryGraph.getPercentImprovementChartAsBase64Image();
    }
    return '';
  }
}
