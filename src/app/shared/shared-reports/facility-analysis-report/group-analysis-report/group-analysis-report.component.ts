import { Component, Input } from '@angular/core';
import { AnalysisGroupItem, AnalysisService } from 'src/app/facility/analysis/analysis.service';
import { MonthlyAnalysisSummary } from 'src/app/models/analysis';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
  selector: 'app-group-analysis-report',
  templateUrl: './group-analysis-report.component.html',
  styleUrl: './group-analysis-report.component.css'
})
export class GroupAnalysisReportComponent {
  @Input({ required: true })
  analysisItem: IdbAnalysisItem;
  @Input({ required: true })
  facility: IdbFacility;
  @Input({required: true})
  groupMonthlySummary: MonthlyAnalysisSummary;

  groupItem: AnalysisGroupItem;
  constructor(private analysisService: AnalysisService) {
  }

  ngOnInit() {
    this.groupItem = this.analysisService.getGroupItem(this.groupMonthlySummary.group);
  }
}
