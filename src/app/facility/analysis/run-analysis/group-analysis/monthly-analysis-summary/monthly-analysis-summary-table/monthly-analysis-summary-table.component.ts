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
  numPredictorColumns: number;

  predictorColumns: Array<PredictorData>;
  constructor(private analysisService: AnalysisService) { }

  ngOnInit(): void {
    this.monthlyTableColumnsSub = this.analysisService.monthlyTableColumns.subscribe(columns => {
      this.monthlyTableColumns = columns;
      this.setNumEnergyColumns();
      this.setNumImprovementColumns();
      this.setNumPredictorColumns();
      this.setPredictorVariables();
    })
  }

  ngOnDestroy() {
    this.monthlyTableColumnsSub.unsubscribe();
  }

  setPredictorVariables() {
    let predictorColumns: Array<PredictorData> = new Array();
    this.monthlyAnalysisSummaryData.forEach((data, index) => {
      this.monthlyTableColumns.predictors.forEach(predictorItem => {
        if (predictorItem.display) {
          if (index == 0) {
            predictorColumns.push(predictorItem.predictor)
          }
          let monthData: { predictorId: string, usage: number } = data.predictorUsage.find(usageItem => { return usageItem.predictorId == predictorItem.predictor.id });
          data[predictorItem.predictor.name] = monthData.usage;
        }else if(data[predictorItem.predictor.name] != undefined){
          delete data[predictorItem.predictor.name];
        }
      })
    })
    this.predictorColumns = predictorColumns;
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

  setNumPredictorColumns() {
    let numPredictorColumns: number = 0;
    this.monthlyTableColumns.predictors.forEach(predictor => {
      if (predictor.display) {
        numPredictorColumns++;
      }
    });
    this.numPredictorColumns = numPredictorColumns;
  }
}
