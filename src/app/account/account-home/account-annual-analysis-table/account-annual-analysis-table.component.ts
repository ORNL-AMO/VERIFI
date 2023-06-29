import { Component, Input } from '@angular/core';
import { AnnualAnalysisSummary } from 'src/app/models/analysis';
import { IdbAccount, IdbAccountAnalysisItem, IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';

@Component({
  selector: 'app-account-annual-analysis-table',
  templateUrl: './account-annual-analysis-table.component.html',
  styleUrls: ['./account-annual-analysis-table.component.css']
})
export class AccountAnnualAnalysisTableComponent {
  @Input()
  annualAnalysisSummary: Array<AnnualAnalysisSummary>;
  @Input()
  analysisItem: IdbAnalysisItem | IdbAccountAnalysisItem;
  @Input()
  accountOrFacility: IdbAccount | IdbFacility;

  orderDataField: string = 'year';
  orderByDirection: 'asc' | 'desc' = 'asc';
  
  constructor(){

  }

  setOrderDataField(str: string) {
    if (str == this.orderDataField) {
      if (this.orderByDirection == 'desc') {
        this.orderByDirection = 'asc';
      } else {
        this.orderByDirection = 'desc';
      }
    } else {
      this.orderDataField = str;
    }
  }
}
