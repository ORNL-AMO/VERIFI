import { Component, Input, OnInit } from '@angular/core';
import { AnalysisService } from 'src/app/facility/analysis/analysis.service';
import { MonthlyAnalysisSummaryData, MonthlyAnalysisSummaryData2 } from 'src/app/models/analysis';
import { AnalysisGroup, IdbAnalysisItem, IdbFacility, PredictorData } from 'src/app/models/idb';

@Component({
  selector: 'app-monthly-analysis-summary-table',
  templateUrl: './monthly-analysis-summary-table.component.html',
  styleUrls: ['./monthly-analysis-summary-table.component.css']
})
export class MonthlyAnalysisSummaryTableComponent implements OnInit {
  @Input()
  monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData2>;
  @Input()
  analysisItem: IdbAnalysisItem;
  @Input()
  itemsPerPage: number;
  @Input()
  facility: IdbFacility;
  @Input()
  predictorVariables: Array<PredictorData>;
  @Input()
  group: AnalysisGroup;

  orderDataField: string = 'date';
  orderByDirection: 'asc' | 'desc' = 'asc';
  currentPageNumber: number = 1;
  constructor(private analysisService: AnalysisService) { }

  ngOnInit(): void {
    if (this.predictorVariables) {
      this.monthlyAnalysisSummaryData.forEach(data => {
        let dataIndex: number = 0;
        this.predictorVariables.forEach(variable => {
          if (variable.productionInAnalysis) {
            data[variable.name] = data.predictorUsage[dataIndex];
            dataIndex++;
          }
        })
      });
    } else {
      this.predictorVariables = [];
    }
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

  checkFiscalYearEnd(date: Date): boolean {
    return this.analysisService.checkFiscalYearEnd(date, this.facility, this.orderDataField, this.orderByDirection);
  }
}
