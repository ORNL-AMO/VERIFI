import { Injectable } from '@angular/core';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { LocalStorageService } from 'ngx-webstorage';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { AccountdbService } from './account-db.service';
import { FacilitydbService } from './facility-db.service';
import * as _ from 'lodash';
import { AnalysisGroup, AnalysisGroupPredictorVariable, JStatRegressionModel } from '../models/analysis';
import { AnalysisValidationService } from '../shared/helper-services/analysis-validation.service';
import { LoadingService } from '../core-components/loading/loading.service';
import { IdbAccount } from '../models/idbModels/account';
import { IdbFacility } from '../models/idbModels/facility';
import { PredictorDbService } from './predictor-db.service';
import { IdbPredictor } from '../models/idbModels/predictor';
import { getNewAnalysisGroup, IdbAnalysisItem } from '../models/idbModels/analysisItem';

@Injectable({
  providedIn: 'root'
})
export class AnalysisDbService {

  accountAnalysisItems: BehaviorSubject<Array<IdbAnalysisItem>>;
  facilityAnalysisItems: BehaviorSubject<Array<IdbAnalysisItem>>;
  selectedAnalysisItem: BehaviorSubject<IdbAnalysisItem>;

  constructor(private dbService: NgxIndexedDBService, private localStorageService: LocalStorageService,
    private facilityDbService: FacilitydbService, private accountDbService: AccountdbService,
    private predictorDbService: PredictorDbService,
    private analysisValidationService: AnalysisValidationService,
    private loadingService: LoadingService) {
    this.accountAnalysisItems = new BehaviorSubject<Array<IdbAnalysisItem>>([]);
    this.facilityAnalysisItems = new BehaviorSubject<Array<IdbAnalysisItem>>([]);
    this.selectedAnalysisItem = new BehaviorSubject<IdbAnalysisItem>(undefined);
    this.selectedAnalysisItem.subscribe(analysisItem => {
      if (analysisItem) {
        this.localStorageService.store('analysisItemId', analysisItem.id);
      }
    });
  }

  getInitialAnalysisItem(): number {
    let analysisItemId: number = this.localStorageService.retrieve("analysisItemId");
    return analysisItemId;
  }

  async initializeAnalysisItems() {
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    if (selectedAccount) {
      let allAnalysisItesm: Array<IdbAnalysisItem> = await firstValueFrom(this.getAll())
      let accounAnalysisItems: Array<IdbAnalysisItem> = allAnalysisItesm.filter(item => { return item.accountId == selectedAccount.guid });
      this.accountAnalysisItems.next(accounAnalysisItems);
      let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
      if (selectedFacility) {
        let facilityAnalysisItems: Array<IdbAnalysisItem> = accounAnalysisItems.filter(meter => { return meter.facilityId == selectedFacility.guid });
        this.facilityAnalysisItems.next(facilityAnalysisItems);
        let storedAnalysisId: number = this.localStorageService.retrieve("analysisItemId");
        if (storedAnalysisId) {
          let selectedAnalysisItem: IdbAnalysisItem = facilityAnalysisItems.find(item => { return item.id == storedAnalysisId });
          this.selectedAnalysisItem.next(selectedAnalysisItem);
        }
      }
    }
  }


  getAll(): Observable<Array<IdbAnalysisItem>> {
    return this.dbService.getAll('analysisItems');
  }

  async getAllAccountAnalysisItems(accountId: string): Promise<Array<IdbAnalysisItem>> {
    let allAnalysisItesm: Array<IdbAnalysisItem> = await firstValueFrom(this.getAll())
    let analysisItems: Array<IdbAnalysisItem> = allAnalysisItesm.filter(item => { return item.accountId == accountId });
    return analysisItems;
  }

  getById(id: number): Observable<IdbAnalysisItem> {
    return this.dbService.getByKey('analysisItems', id);
  }

  getByIndex(indexName: string, indexValue: number): Observable<IdbAnalysisItem> {
    return this.dbService.getByIndex('analysisItems', indexName, indexValue);
  }

  count() {
    return this.dbService.count('analysisItems');
  }

  addWithObservable(analysisItem: IdbAnalysisItem): Observable<IdbAnalysisItem> {
    return this.dbService.add('analysisItems', analysisItem);
  }

  deleteWithObservable(id: number): Observable<any> {
    return this.dbService.delete('analysisItems', id);
  }

  updateWithObservable(values: IdbAnalysisItem): Observable<IdbAnalysisItem> {
    values.modifiedDate = new Date();
    return this.dbService.update('analysisItems', values);
  }

  getUnits(predictorVariables: Array<AnalysisGroupPredictorVariable>): string {
    let selectedProductionVariableUnits: Array<string> = new Array();
    predictorVariables.forEach(variable => {
      if (variable.productionInAnalysis && variable.unit) {
        selectedProductionVariableUnits.push(variable.unit);
      }
    });
    if (selectedProductionVariableUnits.length > 1) {
      let uniqUnits: Array<string> = _.uniq(selectedProductionVariableUnits);
      if (uniqUnits.length == 1) {
        return uniqUnits[0];
      }
    } else if (selectedProductionVariableUnits.length == 1) {
      return selectedProductionVariableUnits[0];
    }
    return 'units';
  }


  async deleteAnalysisPredictor(predictorToDelete: IdbPredictor) {
    let accountAnalysisItems: Array<IdbAnalysisItem> = this.accountAnalysisItems.getValue();
    let facilityAnalysisItems: Array<IdbAnalysisItem> = accountAnalysisItems.filter(item => {
      return item.facilityId == predictorToDelete.facilityId;
    });
    for (let index = 0; index < facilityAnalysisItems.length; index++) {
      let analysisItem: IdbAnalysisItem = facilityAnalysisItems[index];
      let hasGroupErrors: boolean = false;
      analysisItem.groups.forEach(group => {
        group.predictorVariables = group.predictorVariables.filter(analysisPredictor => {
          return analysisPredictor.id != predictorToDelete.guid
        });
        if (group.analysisType == 'regression') {
          //check selected model uses deleted predictor
          if (group.models) {
            let selectedModel: JStatRegressionModel = group.models.find(model => {
              return model.modelId == group.selectedModelId
            });
            if (selectedModel) {
              let includesDeletedVariable: boolean = selectedModel.predictorVariables.find(modelVariable => {
                return modelVariable.id == predictorToDelete.guid
              }) != undefined;
              if (includesDeletedVariable) {
                //if used then remove all models
                group.models = undefined;
                group.selectedModelId = undefined;
                group.regressionModelYear = undefined;
                group.regressionConstant = undefined;
                group.dateModelsGenerated = undefined;
              } else {
                //if not used in selected model. 
                //Remove models using predictor and keep selection.
                group.models = group.models.filter(model => {
                  return model.predictorVariables.find(modelVariable => {
                    return modelVariable.id == predictorToDelete.guid
                  }) == undefined
                });
              }
            }
          }
        }
        group.groupErrors = this.analysisValidationService.getGroupErrors(group, analysisItem);
        if (group.groupErrors.hasErrors) {
          hasGroupErrors = true;
        }
      });
      analysisItem.setupErrors.groupsHaveErrors = hasGroupErrors;
      await firstValueFrom(this.updateWithObservable(analysisItem));
    };
  }

  async addAnalysisPredictor(newPredictor: IdbPredictor) {
    let accountAnalysisItems: Array<IdbAnalysisItem> = this.accountAnalysisItems.getValue();
    let facilityAnalysisItems: Array<IdbAnalysisItem> = accountAnalysisItems.filter(item => {
      return item.facilityId == newPredictor.facilityId;
    });
    for (let index = 0; index < facilityAnalysisItems.length; index++) {
      let analysisItem: IdbAnalysisItem = facilityAnalysisItems[index];
      analysisItem.groups.forEach(group => {
        group.predictorVariables.push({
          id: newPredictor.guid,
          name: newPredictor.name,
          production: newPredictor.production,
          productionInAnalysis: newPredictor.productionInAnalysis,
          regressionCoefficient: undefined,
          unit: newPredictor.unit
        })
      })
      await firstValueFrom(this.updateWithObservable(analysisItem));
    }
  }


  async deleteGroup(groupId: string) {
    let facilityAnalysisItems: Array<IdbAnalysisItem> = this.facilityAnalysisItems.getValue();
    for (let index = 0; index < facilityAnalysisItems.length; index++) {
      let item: IdbAnalysisItem = facilityAnalysisItems[index];
      item.groups = item.groups.filter(group => { return group.idbGroupId != groupId });
      await firstValueFrom(this.updateWithObservable(item));
    }
  }

  async addGroup(groupId: string) {
    let predictors: Array<IdbPredictor> = this.predictorDbService.facilityPredictors.getValue();
    let predictorVariables: Array<AnalysisGroupPredictorVariable> = predictors.map(predictor => {
      return {
        id: predictor.guid,
        name: predictor.name,
        production: predictor.production,
        productionInAnalysis: true,
        regressionCoefficient: undefined,
        unit: predictor.unit
      }
    });
    let facilityAnalysisItems: Array<IdbAnalysisItem> = this.facilityAnalysisItems.getValue();
    for (let index = 0; index < facilityAnalysisItems.length; index++) {
      let item: IdbAnalysisItem = facilityAnalysisItems[index];
      let analysisGroup: AnalysisGroup = getNewAnalysisGroup(groupId, predictorVariables);
      item.groups.push(analysisGroup);
      await firstValueFrom(this.updateWithObservable(item));
    };
  }

  async deleteAllFacilityAnalysisItems(facilityId: string) {
    let accountAnalysisItems: Array<IdbAnalysisItem> = this.accountAnalysisItems.getValue();
    let facilityAnalysisItems: Array<IdbAnalysisItem> = accountAnalysisItems.filter(analysisItem => { return analysisItem.facilityId == facilityId });
    await this.deleteAnalysisItems(facilityAnalysisItems);
  }


  async deleteAccountAnalysisItems() {
    let accountAnalysisItems: Array<IdbAnalysisItem> = this.accountAnalysisItems.getValue();
    await this.deleteAnalysisItems(accountAnalysisItems);
  }

  async deleteAnalysisItems(analysisItems: Array<IdbAnalysisItem>) {
    for (let i = 0; i < analysisItems.length; i++) {
      this.loadingService.setLoadingMessage('Deleting Facility Analysis Items (' + i + '/' + analysisItems.length + ')...');
      await firstValueFrom(this.deleteWithObservable(analysisItems[i].id));
    }
  }

  getByGuid(guid: string): IdbAnalysisItem {
    let analysisItems: Array<IdbAnalysisItem> = this.accountAnalysisItems.getValue();
    return analysisItems.find(item => {
      return item.guid == guid;
    });
  }

  // getMonthlyPercentBaseload(): Array<{ monthNum: number, percent: number }> {
  //   let values: Array<{ monthNum: number, percent: number }> = new Array();
  //   for (let i = 0; i < 12; i++) {
  //     values.push({
  //       monthNum: i,
  //       percent: undefined
  //     })
  //   }
  //   return values;
  // }
}
