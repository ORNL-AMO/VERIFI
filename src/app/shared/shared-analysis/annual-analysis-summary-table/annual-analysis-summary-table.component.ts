import { Component, Input, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AnalysisService } from 'src/app/facility/analysis/analysis.service';
import { AnalysisTableColumns, AnnualAnalysisSummary } from 'src/app/models/analysis';
import { IdbAnalysisItem, PredictorData } from 'src/app/models/idb';

@Component({
  selector: 'app-annual-analysis-summary-table',
  templateUrl: './annual-analysis-summary-table.component.html',
  styleUrls: ['./annual-analysis-summary-table.component.css']
})
export class AnnualAnalysisSummaryTableComponent implements OnInit {
  @Input()
  annualAnalysisSummary: Array<AnnualAnalysisSummary>;
  @Input()
  analysisItem: IdbAnalysisItem;

  analysisTableColumns: AnalysisTableColumns;
  analysisTableColumnsSub: Subscription;
  numEnergyColumns: number;
  numImprovementColumns: number;
  numPredictorColumns: number;

  
  orderDataField: string = 'year';
  orderByDirection: 'asc' | 'desc' = 'asc';
  predictorColumns: Array<PredictorData>;
  constructor(private analysisService: AnalysisService) { }

  ngOnInit(): void {
    this.analysisTableColumnsSub = this.analysisService.analysisTableColumns.subscribe(columns => {
      this.analysisTableColumns = columns;
      this.setNumEnergyColumns();
      this.setNumImprovementColumns();

      this.setNumPredictorColumns();
      this.setPredictorVariables();
    })
  }

  ngOnDestroy() {
    this.analysisTableColumnsSub.unsubscribe();
  }

  setPredictorVariables() {
    let predictorColumns: Array<PredictorData> = new Array();
    this.annualAnalysisSummary.forEach((data, index) => {
      this.analysisTableColumns.predictors.forEach(predictorItem => {
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


  setNumEnergyColumns() {
    let numEnergyColumns: number = 0;
    if (this.analysisTableColumns.actualEnergy) {
      numEnergyColumns++;
    }
    if (this.analysisTableColumns.modeledEnergy) {
      numEnergyColumns++;
    }
    if (this.analysisTableColumns.adjustedEnergy) {
      numEnergyColumns++;
    }
    this.numEnergyColumns = numEnergyColumns;
  }

  setNumImprovementColumns() {
    let numImprovementColumns: number = 0;
    if (this.analysisTableColumns.SEnPI) {
      numImprovementColumns++;
    }
    if (this.analysisTableColumns.savings) {
      numImprovementColumns++;
    }
    if (this.analysisTableColumns.totalSavingsPercentImprovement) {
      numImprovementColumns++;
    }
    if (this.analysisTableColumns.annualSavingsPercentImprovement) {
      numImprovementColumns++;
    }
    if (this.analysisTableColumns.adjustmentToBaseline) {
      numImprovementColumns++;
    }
    if (this.analysisTableColumns.cummulativeSavings) {
      numImprovementColumns++;
    }
    if (this.analysisTableColumns.newSavings) {
      numImprovementColumns++;
    }
    this.numImprovementColumns = numImprovementColumns;
  }

  setNumPredictorColumns() {
    let numPredictorColumns: number = 0;
    this.analysisTableColumns.predictors.forEach(predictor => {
      if (predictor.display) {
        numPredictorColumns++;
      }
    });
    this.numPredictorColumns = numPredictorColumns;
  }

}