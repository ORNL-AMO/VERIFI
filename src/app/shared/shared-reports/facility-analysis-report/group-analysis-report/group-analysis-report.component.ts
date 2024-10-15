import { Component, Input } from '@angular/core';
import { AnalysisGroupItem, AnalysisService } from 'src/app/facility/analysis/analysis.service';
import { AnalysisGroup, AnalysisGroupPredictorVariable, JStatRegressionModel } from 'src/app/models/analysis';

@Component({
  selector: 'app-group-analysis-report',
  templateUrl: './group-analysis-report.component.html',
  styleUrl: './group-analysis-report.component.css'
})
export class GroupAnalysisReportComponent {
  @Input({required: true})
  group: AnalysisGroup;

  groupItem: AnalysisGroupItem;
  constructor(private analysisService: AnalysisService){
  }

  ngOnInit(){
      this.groupItem = this.analysisService.getGroupItem(this.group);
  }
}
