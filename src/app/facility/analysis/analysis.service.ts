import { Injectable } from '@angular/core';
import { LocalStorageService } from 'ngx-webstorage';
import { BehaviorSubject } from 'rxjs';
import { AnalysisGroup, AnalysisTableColumns, AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
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
        predictorGroupId: undefined
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
}
