import { Component, Input, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AnalysisService } from 'src/app/facility/analysis/analysis.service';
import { MonthlyAnalysisSummaryData, MonthlyTableColumns } from 'src/app/models/analysis';
import { AnalysisGroup, IdbAnalysisItem, IdbFacility, PredictorData } from 'src/app/models/idb';

@Component({
  selector: 'app-monthly-analysis-summary-table',
  templateUrl: './monthly-analysis-summary-table.component.html',
  styleUrls: ['./monthly-analysis-summary-table.component.css']
})
export class MonthlyAnalysisSummaryTableComponent implements OnInit {
  @Input()
  monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
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
  monthlyTableColumns: MonthlyTableColumns;
  monthlyTableColumnsSub: Subscription;
  numEnergyColumns: number;
  numImprovementColumns: number;
  constructor(private analysisService: AnalysisService) { }

  ngOnInit(): void {
    this.monthlyTableColumnsSub = this.analysisService.monthlyTableColumns.subscribe(columns => {
      this.monthlyTableColumns = columns;
      this.setNumEnergyColumns();
      this.setNumImprovementColumns();
      this.setPredictorVariables();
    })
  }

  ngOnDestroy() {
    this.monthlyTableColumnsSub.unsubscribe();
  }

  setPredictorVariables() {
    if (this.predictorVariables && this.monthlyTableColumns.productionVariables) {
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

  setNumEnergyColumns() {
    let numEnergyColumns: number = 0;
    if (this.monthlyTableColumns.actualEnergy) {
      numEnergyColumns++;
    }
    if (this.monthlyTableColumns.modeledEnergy) {
      numEnergyColumns++;
    }
    if (this.monthlyTableColumns.adjustedEnergy) {
      numEnergyColumns++;
    }
    this.numEnergyColumns = numEnergyColumns;
  }

  setNumImprovementColumns() {
    let numImprovementColumns: number = 0;
    if (this.monthlyTableColumns.SEnPI) {
      numImprovementColumns++;
    }
    if (this.monthlyTableColumns.savings) {
      numImprovementColumns++;
    }
    if (this.monthlyTableColumns.percentSavingsComparedToBaseline) {
      numImprovementColumns++;
    }
    if (this.monthlyTableColumns.yearToDateSavings) {
      numImprovementColumns++;
    }
    if (this.monthlyTableColumns.yearToDatePercentSavings) {
      numImprovementColumns++;
    }
    if (this.monthlyTableColumns.rollingSavings) {
      numImprovementColumns++;
    }
    if (this.monthlyTableColumns.rolling12MonthImprovement) {
      numImprovementColumns++;
    }
    this.numImprovementColumns = numImprovementColumns;
  }
}
