import { Injectable } from '@angular/core';
import { LocalStorageService } from 'ngx-webstorage';
import { BehaviorSubject } from 'rxjs';
import { AnalysisGroup, AnalysisGroupPredictorVariable, AnalysisTableColumns, AnnualAnalysisSummary, JStatRegressionModel, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Injectable({
  providedIn: 'root'
})
export class AnalysisService {

  selectedGroup: BehaviorSubject<AnalysisGroup>;
  dataDisplay: BehaviorSubject<"graph" | "table">;

  analysisTableColumns: BehaviorSubject<AnalysisTableColumns>;
  showInvalidModels: BehaviorSubject<boolean>;
  calculating: BehaviorSubject<boolean | 'error'>;
  annualAnalysisSummary: BehaviorSubject<Array<AnnualAnalysisSummary>>;
  monthlyAccountAnalysisData: BehaviorSubject<Array<MonthlyAnalysisSummaryData>>;
  accountAnalysisItem: IdbAccountAnalysisItem;
  showDetail: BehaviorSubject<boolean>;
  hideInUseMessage: boolean = false;
  constructor(private localStorageService: LocalStorageService) {
    let dataDisplay: "graph" | "table" = this.localStorageService.retrieve("analysisDataDisplay");
    if (!dataDisplay) {
      dataDisplay = "table";
    }
    this.selectedGroup = new BehaviorSubject<AnalysisGroup>(undefined);
    this.dataDisplay = new BehaviorSubject<"graph" | "table">(dataDisplay);
    this.showInvalidModels = new BehaviorSubject<boolean>(false);
    this.calculating = new BehaviorSubject<boolean>(true);
    this.annualAnalysisSummary = new BehaviorSubject([]);
    this.monthlyAccountAnalysisData = new BehaviorSubject([]);
    let showDetail: boolean = this.localStorageService.retrieve("showDetail");
    if (showDetail == undefined) {
      showDetail = true;
    }
    this.showDetail = new BehaviorSubject<boolean>(showDetail);

    let analysisTableColumns: AnalysisTableColumns = this.localStorageService.retrieve("analysisTableColumns");
    if (!analysisTableColumns) {
      analysisTableColumns = {
        incrementalImprovement: false,
        SEnPI: false,
        savings: false,
        percentSavingsComparedToBaseline: false,
        yearToDateSavings: false,
        yearToDatePercentSavings: false,
        rollingSavings: false,
        rolling12MonthImprovement: false,
        productionVariables: true,
        energy: true,
        actualEnergy: true,
        modeledEnergy: true,
        adjusted: true,
        baselineAdjustmentForNormalization: true,
        baselineAdjustmentForOther: true,
        baselineAdjustment: true,
        totalSavingsPercentImprovement: true,
        annualSavingsPercentImprovement: true,
        cummulativeSavings: true,
        newSavings: true,
        predictors: [],
        predictorGroupId: undefined,
        bankedSavings: true
      }
    }
    this.analysisTableColumns = new BehaviorSubject<AnalysisTableColumns>(analysisTableColumns);


    this.dataDisplay.subscribe(dataDisplay => {
      if (dataDisplay) {
        this.localStorageService.store('analysisDataDisplay', dataDisplay);
      }
    });

    this.analysisTableColumns.subscribe(analysisTableColumns => {
      if (analysisTableColumns) {
        this.localStorageService.store('analysisTableColumns', analysisTableColumns);
      }
    });


    this.showDetail.subscribe(showDetail => {
      if (showDetail != undefined) {
        this.localStorageService.store('showDetail', showDetail);
      }
    });
  }

  setDataAdjustments(analysisItem: IdbAnalysisItem): IdbAnalysisItem {
    if (analysisItem.baselineYear < analysisItem.reportYear) {
      analysisItem.groups.forEach(group => {
        let yearDataAdjustments: Array<{ year: number, amount: number }> = new Array();
        let baselineAdjustments: Array<{ year: number, amount: number }> = new Array();
        for (let year: number = analysisItem.baselineYear + 1; year <= analysisItem.reportYear; year++) {
          yearDataAdjustments.push({
            year: year,
            amount: 0
          });
          baselineAdjustments.push({
            year: year,
            amount: 0
          });
        }
        group.dataAdjustments = yearDataAdjustments;
        group.baselineAdjustmentsV2 = baselineAdjustments;
      });
    }
    return analysisItem;
  }

  checkFiscalYearEnd(date: Date, facilityOrAccount: IdbFacility | IdbAccount, orderDataField: string, orderByDirection: 'asc' | 'desc'): boolean {
    if (orderDataField == 'date' || orderDataField == 'fiscalYear') {
      if (facilityOrAccount.fiscalYear == 'calendarYear' && (orderByDirection == 'asc' || orderDataField == 'fiscalYear')) {
        return date.getUTCMonth() == 0;
      } else if (facilityOrAccount.fiscalYear == 'calendarYear' && orderByDirection == 'desc') {
        return date.getUTCMonth() == 11;
      } else {
        if (date.getUTCMonth() == facilityOrAccount.fiscalYearMonth && orderByDirection == 'asc') {
          return true;
        } else if (date.getUTCMonth() + 1 == facilityOrAccount.fiscalYearMonth && orderByDirection == 'desc') {
          return true;
        } else {
          return false;
        }
      }
    }
    return false;
  }



  getGroupItem(group: AnalysisGroup): AnalysisGroupItem {
    let predictorVariables: Array<AnalysisGroupPredictorVariable> = [];
    let adjust_R2: number = 0;
    let regressionEquation: string = '';
    let selectedModel: JStatRegressionModel;
    if (group.analysisType == 'regression') {
      if (group.selectedModelId) {
        selectedModel = group.models.find(model => { return model.modelId == group.selectedModelId });
        adjust_R2 = selectedModel.adjust_R2;
        predictorVariables = selectedModel.predictorVariables;
        regressionEquation = this.getRegressionsEquationFromModel(selectedModel);
      } else {
        predictorVariables = group.predictorVariables.filter(variable => {
          return (variable.productionInAnalysis == true);
        });
        regressionEquation = this.getRegressionEquationNoModel(group, predictorVariables);
      }
    } else if (group.analysisType != 'absoluteEnergyConsumption') {
      predictorVariables = group.predictorVariables.filter(variable => {
        return (variable.productionInAnalysis == true);
      });
    }
    return {
      group: group,
      predictorVariables: predictorVariables,
      adjust_R2: adjust_R2,
      regressionEquation: regressionEquation,
      selectedModel: selectedModel
    }
  }

  getRegressionsEquationFromModel(model: JStatRegressionModel): string {
    //     <span *ngFor="let coefVal of model.coef; let index = index;">
    //     <span *ngIf="index == 0">{{coefVal| customNumber}}</span>
    //     <span *ngIf="index != 0">({{coefVal|
    //         customNumber}}*{{model.predictorVariables[index-1].name}})</span> <span
    //         *ngIf="index != model.coef.length-1"> +</span>
    // </span>
    let regressionEquation: string = '';
    for (let i = 0; i < model.coef.length; i++) {
      regressionEquation = regressionEquation + model.coef[i].toLocaleString(undefined, { maximumSignificantDigits: 5 });
      if (i != 0) {
        regressionEquation = regressionEquation + '*' + model.predictorVariables[i - 1].name;
      }
      if (i != model.coef.length - 1) {
        regressionEquation = regressionEquation + ' + ';
      }
    }
    return regressionEquation;
  }

  getRegressionEquationNoModel(group: AnalysisGroup, predictorVariables: Array<AnalysisGroupPredictorVariable>): string {
    let regressionEquation: string = group.regressionConstant + ' + ';
    for (let i = 0; i < predictorVariables.length; i++) {
      regressionEquation = regressionEquation + predictorVariables[i].regressionCoefficient + '*' + predictorVariables[i].name;
      if (i != predictorVariables.length - 1) {
        regressionEquation = regressionEquation + ' + ';
      }
    }
    return regressionEquation;
  }
}


export interface AnalysisGroupItem {
  group: AnalysisGroup,
  predictorVariables: Array<AnalysisGroupPredictorVariable>,
  adjust_R2: number,
  regressionEquation: string,
  selectedModel: JStatRegressionModel
}