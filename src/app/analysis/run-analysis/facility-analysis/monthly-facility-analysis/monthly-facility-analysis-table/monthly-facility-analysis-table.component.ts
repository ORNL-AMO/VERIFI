import { Component, Input, OnInit } from '@angular/core';
import { AnalysisService } from 'src/app/analysis/analysis.service';
import { MonthlyFacilityAnalysisData } from 'src/app/analysis/calculations/facility-analysis-calculations.service';
import { IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';

@Component({
  selector: 'app-monthly-facility-analysis-table',
  templateUrl: './monthly-facility-analysis-table.component.html',
  styleUrls: ['./monthly-facility-analysis-table.component.css']
})
export class MonthlyFacilityAnalysisTableComponent implements OnInit {
  @Input()
  monthlyFacilityAnalysisData: Array<MonthlyFacilityAnalysisData>;
  @Input()
  analysisItem: IdbAnalysisItem;
  @Input()
  facility: IdbFacility;
  @Input()
  itemsPerPage: number;

  orderDataField: string = 'date';
  orderByDirection: 'asc' | 'desc' = 'asc';
  currentPageNumber: number = 1;
  constructor(private analysisService: AnalysisService) { }

  ngOnInit(): void {
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
