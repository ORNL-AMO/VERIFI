import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AnalysisService } from 'src/app/data-evaluation/facility/analysis/analysis.service';
import { AnalysisGroup, AnalysisGroupPredictorVariable, AnalysisTableColumns, AnnualAnalysisSummary } from 'src/app/models/analysis';
import { CopyTableService } from '../../helper-services/copy-table.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';

@Component({
    selector: 'app-annual-analysis-summary-table',
    templateUrl: './annual-analysis-summary-table.component.html',
    styleUrls: ['./annual-analysis-summary-table.component.css'],
    standalone: false
})
export class AnnualAnalysisSummaryTableComponent implements OnInit {
  @Input()
  annualAnalysisSummary: Array<AnnualAnalysisSummary>;
  @Input()
  analysisItem: IdbAnalysisItem | IdbAccountAnalysisItem;
  @Input()
  accountOrFacility: IdbAccount | IdbFacility;
  @Input({required: true})
  printBlock: 'consumption' | 'predictors' | 'savings' | 'all';
  @Input()
  inReport: boolean;
  @Input()
  group: AnalysisGroup;

  @ViewChild('dataTable', { static: false }) dataTable: ElementRef;

  analysisTableColumns: AnalysisTableColumns;
  analysisTableColumnsSub: Subscription;
  numEnergyColumns: number;
  numImprovementColumns: number;
  numPredictorColumns: number;


  orderDataField: string = 'year';
  orderByDirection: 'asc' | 'desc' = 'asc';
  predictorColumns: Array<AnalysisGroupPredictorVariable>;
  copyingTable: boolean = false;
  hasBanked: boolean;
  hasBankedSavings: boolean;
  hasTransitionYear: boolean;
  modelYear: number;
  constructor(private analysisService: AnalysisService, private copyTableService: CopyTableService,
    private router: Router) { }

  ngOnInit(): void {
    this.analysisTableColumnsSub = this.analysisService.analysisTableColumns.subscribe(columns => {
      this.analysisTableColumns = columns;
      this.setNumEnergyColumns();
      this.setNumImprovementColumns();

      this.setNumPredictorColumns();
      this.setPredictorVariables();
    });
    this.setHasBanked();
    this.setModelYear();
  }

  ngOnDestroy() {
    this.analysisTableColumnsSub.unsubscribe();
  }

  setPredictorVariables() {
    let inAccount: boolean = this.router.url.includes('account');
    if (!inAccount) {
      let predictorColumns: Array<AnalysisGroupPredictorVariable> = new Array();
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
    if (this.analysisTableColumns.savingsUnbanked) {
      numImprovementColumns++;
    }
    if (this.analysisTableColumns.bankedSavings) {
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

  copyTable() {
    this.copyingTable = true;
    setTimeout(() => {
      this.copyTableService.copyTable(this.dataTable);
      this.copyingTable = false;
    }, 200)
  }

  setHasBanked() {
    this.hasBanked = this.annualAnalysisSummary.find(data => {
      return data.isBanked
    }) != undefined;
    this.hasBankedSavings = this.annualAnalysisSummary.find(data => {
      return data.savingsBanked
    }) != undefined;
    this.hasTransitionYear = this.annualAnalysisSummary.find(data => {
      return data.isIntermediateBanked
    }) != undefined;
  }

  setModelYear(){
    if(this.group && this.group.analysisType == 'regression'){
      this.modelYear = this.group.regressionModelYear;
    }
  }
}
