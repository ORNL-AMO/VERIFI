import { Component, Input } from '@angular/core';
import { Subscription } from 'rxjs';
import { DataEvaluationService } from 'src/app/data-evaluation/data-evaluation.service';
import { AnalysisGroup, AnnualAnalysisSummary } from 'src/app/models/analysis';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { AnalysisReportSettings } from 'src/app/models/idbModels/facilityReport';

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
}
