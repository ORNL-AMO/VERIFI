import { Component, Input } from '@angular/core';
import { PerformanceReport } from 'src/app/calculations/performance-report-calculations/performanceReport';
import { IdbAccount, IdbAccountAnalysisItem } from 'src/app/models/idb';

@Component({
  selector: 'app-performance-report-facility-table',
  templateUrl: './performance-report-facility-table.component.html',
  styleUrls: ['./performance-report-facility-table.component.css']
})
export class PerformanceReportFacilityTableComponent {
  @Input()
  performanceReport: PerformanceReport;
  @Input()
  account: IdbAccount;
  @Input()
  selectedAnalysisItem: IdbAccountAnalysisItem;

  savingsGoal: number;
  constructor(){

  }

  ngOnInit(){
    if(this.selectedAnalysisItem.analysisCategory == 'energy'){
      this.savingsGoal = this.account.sustainabilityQuestions.energyReductionPercent;
    }else if(this.selectedAnalysisItem.analysisCategory == 'water'){
      this.savingsGoal = this.account.sustainabilityQuestions.waterReductionPercent;
    }
  }
}
