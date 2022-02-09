import { Injectable } from '@angular/core';
import { LocalStorageService } from 'ngx-webstorage';
import { BehaviorSubject } from 'rxjs';
import { AnalysisGroup, PredictorData } from '../models/idb';

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
    return false;
  }

  checkValueValid(value: number): boolean {
    return (value != undefined) && (value != null) && (isNaN(value) == false);
  }
}
