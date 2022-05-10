import { Injectable } from '@angular/core';
import { LocalStorageService } from 'ngx-webstorage';
import { BehaviorSubject } from 'rxjs';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { AnalysisTableColumns } from 'src/app/models/analysis';
import { CalanderizationOptions, CalanderizedMeter } from 'src/app/models/calanderization';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { ConvertMeterDataService } from 'src/app/shared/helper-services/convert-meter-data.service';
import { AnalysisGroup, IdbAccount, IdbAnalysisItem, IdbFacility, IdbUtilityMeter, PredictorData } from '../../models/idb';

@Injectable({
  providedIn: 'root'
})
export class AnalysisService {

  selectedGroup: BehaviorSubject<AnalysisGroup>;
  dataDisplay: BehaviorSubject<"graph" | "table">;

  analysisTableColumns: BehaviorSubject<AnalysisTableColumns>;
  calanderizedMeters: Array<CalanderizedMeter>;
  constructor(private localStorageService: LocalStorageService, private calendarizationService: CalanderizationService,
    private convertMeterDataService: ConvertMeterDataService, private facilityDbService: FacilitydbService,
    private utilityMeterDbService: UtilityMeterdbService, private analysisDbService: AnalysisDbService) {
    let dataDisplay: "graph" | "table" = this.localStorageService.retrieve("analysisDataDisplay");
    if (!dataDisplay) {
      dataDisplay = "table";
    }
    this.selectedGroup = new BehaviorSubject<AnalysisGroup>(undefined);
    this.dataDisplay = new BehaviorSubject<"graph" | "table">(dataDisplay);


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
        adjustedForNormalization: true,
        adjusted: true,
        baselineAdjustmentForNormalization: true,
        baselineAdjustmentForOther: true,
        baselineAdjustment: true,
        totalSavingsPercentImprovement: true,
        annualSavingsPercentImprovement: true,
        adjustmentToBaseline: true,
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


    // this.monthlyTableColumns.subscribe(annualTableColumns => {
    //   if (annualTableColumns) {
    //     this.localStorageService.store('annualTableColumns', monthlyTableColumns);
    //   }
    // });
  }

  checkGroupHasError(group: AnalysisGroup): boolean {
    if (group.analysisType != 'absoluteEnergyConsumption') {
      let hasProductionVariable: boolean = false;
      group.predictorVariables.forEach(variable => {
        if (variable.productionInAnalysis) {
          hasProductionVariable = true;
        }
      });
      if (!hasProductionVariable) {
        return true;
      }
      if (group.analysisType == 'regression') {
        if (!this.checkValueValid(group.regressionConstant)) {
          return true;
        }
        if (!this.checkValueValid(group.regressionModelYear)) {
          return true;
        }
        for (let index = 0; index < group.predictorVariables.length; index++) {
          let variable: PredictorData = group.predictorVariables[index];
          if (variable.productionInAnalysis && !this.checkValueValid(variable.regressionCoefficient)) {
            return true;
          }
        }
      }
      if (group.analysisType == 'modifiedEnergyIntensity') {
        if (group.specifiedMonthlyPercentBaseload) {
          for (let i = 0; i < group.monthlyPercentBaseload.length; i++) {
            if (!this.checkValueValid(group.monthlyPercentBaseload[i].percent)) {
              return true;
            }
          }
        } else if (!this.checkValueValid(group.averagePercentBaseload)) {
          return true;
        }
      }
    }
    return false;
  }

  checkValueValid(value: number): boolean {
    return (value != undefined) && (value != null) && (isNaN(value) == false);
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


  setCalanderizedMeters() {
    let analysisItem: IdbAnalysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    let calanderizationOptions: CalanderizationOptions = {
      energyIsSource: analysisItem.energyIsSource
    }
    console.log(calanderizationOptions.energyIsSource);
    let calanderizedMeterData: Array<CalanderizedMeter> = this.calendarizationService.getCalanderizedMeterData(facilityMeters, false, false, calanderizationOptions);
    calanderizedMeterData.forEach(calanderizedMeter => {
      calanderizedMeter.monthlyData = this.convertMeterDataService.convertMeterDataToAnalysis(analysisItem, calanderizedMeter.monthlyData, selectedFacility, calanderizedMeter.meter);
    });
    this.calanderizedMeters = calanderizedMeterData;
  }
}
