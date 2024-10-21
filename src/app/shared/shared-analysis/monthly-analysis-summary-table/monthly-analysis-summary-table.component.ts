import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AnalysisService } from 'src/app/facility/analysis/analysis.service';
import { AnalysisGroup, AnalysisGroupPredictorVariable, AnalysisTableColumns, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { CopyTableService } from '../../helper-services/copy-table.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';

@Component({
  selector: 'app-monthly-analysis-summary-table',
  templateUrl: './monthly-analysis-summary-table.component.html',
  styleUrls: ['./monthly-analysis-summary-table.component.css']
})
export class MonthlyAnalysisSummaryTableComponent implements OnInit {
  @Input()
  monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
  @Input()
  analysisItem: IdbAnalysisItem | IdbAccountAnalysisItem;
  @Input()
  itemsPerPage: number;
  @Input()
  facilityOrAccount: IdbFacility | IdbAccount;
  @Input()
  predictorVariables: Array<AnalysisGroupPredictorVariable>;
  @Input()
  group: AnalysisGroup;
  @Input()
  inReport: boolean;
  @Input()
  isReportBaselineYear: boolean;
  @Input({required: true})
  printBlock: 'consumption' | 'predictors' | 'savings' | 'all';

  @ViewChild('dataTable', { static: false }) dataTable: ElementRef;

  orderDataField: string = 'date';
  orderByDirection: 'asc' | 'desc' = 'asc';
  currentPageNumber: number = 1;
  analysisTableColumns: AnalysisTableColumns;
  analysisTableColumnsSub: Subscription;
  numEnergyColumns: number;
  numImprovementColumns: number;
  numPredictorColumns: number;

  predictorColumns: Array<AnalysisGroupPredictorVariable>;
  copyingTable: boolean = false;
  hasBanked: boolean;
  constructor(private analysisService: AnalysisService, private copyTableService: CopyTableService, private router: Router) { }

  ngOnInit(): void {
    this.analysisTableColumnsSub = this.analysisService.analysisTableColumns.subscribe(columns => {
      this.analysisTableColumns = columns;
      this.setNumEnergyColumns();
      this.setNumImprovementColumns();
      this.setNumPredictorColumns();
      this.setPredictorVariables();
    })
    this.setHasBanked();
  }

  ngOnDestroy() {
    this.analysisTableColumnsSub.unsubscribe();
  }

  setPredictorVariables() {
    let inAccount: boolean = this.router.url.includes('account');
    if (!inAccount) {
      let predictorColumns: Array<AnalysisGroupPredictorVariable> = new Array();
      this.monthlyAnalysisSummaryData.forEach((data, index) => {
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
      })
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

  checkFiscalYearEnd(date: Date): boolean {
    return this.analysisService.checkFiscalYearEnd(date, this.facilityOrAccount, this.orderDataField, this.orderByDirection);
  }

  setNumEnergyColumns() {
    let numEnergyColumns: number = 0;
    if (this.analysisTableColumns.actualEnergy) {
      numEnergyColumns++;
    }
    if (this.analysisTableColumns.modeledEnergy && this.group) {
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
    if (this.analysisTableColumns.percentSavingsComparedToBaseline) {
      numImprovementColumns++;
    }
    if (this.analysisTableColumns.yearToDateSavings) {
      numImprovementColumns++;
    }
    if (this.analysisTableColumns.yearToDatePercentSavings) {
      numImprovementColumns++;
    }
    if (this.analysisTableColumns.rollingSavings) {
      numImprovementColumns++;
    }
    if (this.analysisTableColumns.rolling12MonthImprovement) {
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

  //TODO: Should be a pipe...
  checkIsProduction(predictorVariable: AnalysisGroupPredictorVariable): boolean {
    if (this.group) {
      let groupVariable: AnalysisGroupPredictorVariable = this.group.predictorVariables.find(variable => { return variable.id == predictorVariable.id })
      if (groupVariable) {
        return groupVariable.productionInAnalysis;
      }
    }
    return false;
  }

  copyTable() {
    this.copyingTable = true;
    setTimeout(() => {
      this.copyTableService.copyTable(this.dataTable);
      this.copyingTable = false;
    }, 200)
  }

  setHasBanked() {
    this.hasBanked = this.monthlyAnalysisSummaryData.find(data => {
      return data.isBanked
    }) != undefined;
  }
}
