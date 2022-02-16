import { Injectable } from '@angular/core';
import { LocalStorageService } from 'ngx-webstorage';
import { BehaviorSubject } from 'rxjs';
import { AnalysisGroup, IdbFacility, PredictorData } from '../models/idb';

@Injectable({
  providedIn: 'root'
})
export class AnalysisService {

  selectedGroup: BehaviorSubject<AnalysisGroup>;
  dataDisplay: BehaviorSubject<"graph" | "table">;
  constructor(private localStorageService: LocalStorageService) {
    let dataDisplay: "graph" | "table" = this.localStorageService.retrieve("analysisDataDisplay");
    if (!dataDisplay) {
      dataDisplay = "table";
    }
    this.selectedGroup = new BehaviorSubject<AnalysisGroup>(undefined);
    this.dataDisplay = new BehaviorSubject<"graph" | "table">(dataDisplay);

    this.dataDisplay.subscribe(dataDisplay => {
      if (dataDisplay) {
        this.localStorageService.store('analysisDataDisplay', dataDisplay);
      }
    });
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

  checkFiscalYearEnd(date: Date, facility: IdbFacility, orderDataField: string, orderByDirection: 'asc' | 'desc'): boolean {
    if (orderDataField == 'date' || orderDataField == 'fiscalYear') {
      if (facility.fiscalYear == 'calendarYear' && (orderByDirection == 'asc' || orderDataField == 'fiscalYear')) {
        return date.getUTCMonth() == 0;
      } else if (facility.fiscalYear == 'calendarYear' && orderByDirection == 'desc') {
        return date.getUTCMonth() == 11;
      } else {
        if (date.getUTCMonth() == facility.fiscalYearMonth && orderByDirection == 'asc') {
          return true;
        } else if (date.getUTCMonth() + 1 == facility.fiscalYearMonth && orderByDirection == 'desc') {
          return true;
        } else {
          return false;
        }
      }
    }
    return false;
  }


}
