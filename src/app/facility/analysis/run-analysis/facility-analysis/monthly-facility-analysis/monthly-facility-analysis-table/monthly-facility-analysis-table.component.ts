import { Component, Input, OnInit } from '@angular/core';
import { AnalysisService } from 'src/app/facility/analysis/analysis.service';
import { FacilityMonthlyAnalysisSummaryData, MonthlyFacilityAnalysisData } from 'src/app/models/analysis';
import { IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';

@Component({
  selector: 'app-monthly-facility-analysis-table',
  templateUrl: './monthly-facility-analysis-table.component.html',
  styleUrls: ['./monthly-facility-analysis-table.component.css']
})
export class MonthlyFacilityAnalysisTableComponent implements OnInit {
  @Input()
  monthlyFacilityAnalysisData: Array<FacilityMonthlyAnalysisSummaryData>;
  @Input()
  analysisItem: IdbAnalysisItem;
  @Input()
  facility: IdbFacility;
  @Input()
  itemsPerPage: number;

  orderDataField: string = 'date';
  orderByDirection: 'asc' | 'desc' = 'asc';
  currentPageNumber: number = 1;
  baselineYear: number;
  predictorVariables = [];
  constructor(private analysisService: AnalysisService) { }

  ngOnInit(): void {
    this.baselineYear = this.facility.sustainabilityQuestions.energyReductionBaselineYear;
    if (this.facility.fiscalYear == 'nonCalendarYear' && this.facility.fiscalYearCalendarEnd) {
      this.baselineYear = this.baselineYear - 1;
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
