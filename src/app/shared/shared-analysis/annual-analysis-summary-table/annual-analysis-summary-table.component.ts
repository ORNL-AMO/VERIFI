import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AnalysisService } from 'src/app/facility/analysis/analysis.service';
import { AnalysisTableColumns, AnnualAnalysisSummary } from 'src/app/models/analysis';
import { IdbAccount, IdbAccountAnalysisItem, IdbAnalysisItem, IdbFacility, PredictorData } from 'src/app/models/idb';
import { CopyTableService } from '../../helper-services/copy-table.service';

@Component({
  selector: 'app-annual-analysis-summary-table',
  templateUrl: './annual-analysis-summary-table.component.html',
  styleUrls: ['./annual-analysis-summary-table.component.css']
})
export class AnnualAnalysisSummaryTableComponent implements OnInit {
  @Input()
  annualAnalysisSummary: Array<AnnualAnalysisSummary>;
  @Input()
  analysisItem: IdbAnalysisItem | IdbAccountAnalysisItem;
  @Input()
  accountOrFacility: IdbAccount | IdbFacility;

  @ViewChild('dataTable', { static: false }) dataTable: ElementRef;

  analysisTableColumns: AnalysisTableColumns;
  analysisTableColumnsSub: Subscription;
  numEnergyColumns: number;
  numImprovementColumns: number;
  numPredictorColumns: number;


  orderDataField: string = 'year';
  orderByDirection: 'asc' | 'desc' = 'asc';
  predictorColumns: Array<PredictorData>;
  copyingTable: boolean = false;
  constructor(private analysisService: AnalysisService, private copyTableService: CopyTableService,
    private router: Router) { }

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
    let inAccount: boolean = this.router.url.includes('account');
    if (!inAccount) {
      let predictorColumns: Array<PredictorData> = new Array();
      this.annualAnalysisSummary.forEach((data, index) => {
        this.analysisTableColumns.predictors.forEach(predictorItem => {
          if (predictorItem.display) {
            if (index == 0) {
              predictorColumns.push(predictorItem.predictor)
            }
            let monthData: { predictorId: string, usage: number } = data.predictorUsage.find(usageItem => { return usageItem.predictorId == predictorItem.predictor.id });
            if (monthData) {
              data[predictorItem.predictor.name] = monthData.usage;
            }
          } else if (data[predictorItem.predictor.name] != undefined) {
            delete data[predictorItem.predictor.name];
          }
        })
      });
      this.predictorColumns = predictorColumns;
    } else {
      this.predictorColumns = [];
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


  setNumEnergyColumns() {
    let numEnergyColumns: number = 0;
    if (this.analysisTableColumns.actualEnergy) {
      numEnergyColumns++;
    }
    if (this.analysisTableColumns.modeledEnergy) {
      numEnergyColumns++;
    }
    if (this.analysisTableColumns.adjustedForNormalization) {
      numEnergyColumns++;
    }
    if (this.analysisTableColumns.adjusted) {
      numEnergyColumns++;
    }

    if (this.analysisTableColumns.baselineAdjustmentForNormalization) {
      numEnergyColumns++;
    }

    if (this.analysisTableColumns.baselineAdjustmentForOther) {
      numEnergyColumns++;
    }
    if (this.analysisTableColumns.baselineAdjustment) {
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
    // if (this.analysisTableColumns.adjustmentToBaseline) {
    //   numImprovementColumns++;
    // }
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

  copyTable() {
    this.copyingTable = true;
    setTimeout(() => {
      this.copyTableService.copyTable(this.dataTable);
      this.copyingTable = false;
    }, 200)
  }
}
