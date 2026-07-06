import { Component, Input, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { DataEvaluationService } from 'src/app/data-evaluation/data-evaluation.service';
import { AnalysisGroup, AnnualAnalysisSummary } from 'src/app/models/analysis';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { AnalysisReportSettings } from 'src/app/models/idbModels/facilityReport';
import { AnnualAnalysisSummaryGraphComponent } from 'src/app/shared/shared-analysis/annual-analysis-summary-graph/annual-analysis-summary-graph.component';

@Component({
    selector: 'app-group-annual-analysis-report',
    templateUrl: './group-annual-analysis-report.component.html',
    styleUrl: './group-annual-analysis-report.component.css',
    standalone: false
})
export class GroupAnnualAnalysisReportComponent {
  @Input({ required: true })
  analysisItem: IdbAnalysisItem;
  @Input({ required: true })
  annualAnalysisSummaryData: Array<AnnualAnalysisSummary>
  @Input({ required: true })
  facility: IdbFacility;
  @Input({ required: true })
  analysisReportSettings: AnalysisReportSettings;
  @Input({ required: true })
  group: AnalysisGroup;

  print: boolean;
  printSub: Subscription;

  @ViewChild(AnnualAnalysisSummaryGraphComponent) annualAnalysisSummaryGraphComponent ?: AnnualAnalysisSummaryGraphComponent;
  
  constructor(private dataEvaluationService: DataEvaluationService) {

  }

  ngOnInit() {
    this.printSub = this.dataEvaluationService.print.subscribe(print => {
      this.print = print;
    });
  }

  ngOnDestroy() {
    this.printSub.unsubscribe();
  }

  async getEnergyIntensityChart(): Promise<string> {
    if (this.annualAnalysisSummaryGraphComponent) {
      return await this.annualAnalysisSummaryGraphComponent.getEnergyIntensityChartAsBase64Image();
    }
    return '';
  }

  async getPercentImprovementChart(): Promise<string> {
    if (this.annualAnalysisSummaryGraphComponent) {
      return await this.annualAnalysisSummaryGraphComponent.getPercentImprovementChartAsBase64Image();
    }
    return '';
  }
}
