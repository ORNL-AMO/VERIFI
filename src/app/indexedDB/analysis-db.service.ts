import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Injectable, inject } from '@angular/core';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Observable, firstValueFrom } from 'rxjs';
import * as _ from 'lodash';
import { AnalysisGroup, AnalysisGroupPredictorVariable, JStatRegressionModel } from '../models/analysis';
import { LoadingService } from '../core-components/loading/loading.service';
import { IdbPredictor } from '../models/idbModels/predictor';
import { getNewAnalysisGroup, IdbAnalysisItem } from '../models/idbModels/analysisItem';
import { IndexedDbAccessService } from './indexed-db-access.service';

@Injectable({
  providedIn: 'root'
})
export class AnalysisDbService {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  constructor(
    private dbService: NgxIndexedDBService,
    private loadingService: LoadingService,
    private indexedDbAccess: IndexedDbAccessService
  ) {
  }

  getAll(): Observable<Array<IdbAnalysisItem>> {
    return this.dbService.getAll('analysisItems');
  }

  async getAllAccountAnalysisItems(accountId: string): Promise<Array<IdbAnalysisItem>> {
    return this.indexedDbAccess.getAllByIndex<IdbAnalysisItem>('analysisItems', 'accountId', accountId);
  }

  getById(id: number): Observable<IdbAnalysisItem> {
    return this.dbService.getByKey('analysisItems', id);
  }

  getByIndex(indexName: string, indexValue: IDBValidKey): Observable<IdbAnalysisItem> {
    return this.dbService.getByIndex('analysisItems', indexName, indexValue);
  }

  getStoredByGuid(guid: string): Promise<IdbAnalysisItem | undefined> {
    return this.indexedDbAccess.getByGuid<IdbAnalysisItem>('analysisItems', guid);
  }

  count() {
    return this.dbService.count('analysisItems');
  }

  addWithObservable(analysisItem: IdbAnalysisItem): Observable<IdbAnalysisItem> {
    return this.dbService.add('analysisItems', this.getPersistableAnalysisItem(analysisItem));
  }

  deleteWithObservable(id: number): Observable<any> {
    return this.dbService.delete('analysisItems', id);
  }

  updateWithObservable(values: IdbAnalysisItem): Observable<IdbAnalysisItem> {
    values.modifiedDate = new Date();
    return this.dbService.update('analysisItems', this.getPersistableAnalysisItem(values));
  }

  private getPersistableAnalysisItem(analysisItem: IdbAnalysisItem): IdbAnalysisItem {
    const persistableItem = { ...analysisItem } as IdbAnalysisItem & { calculatedReportYear?: number };
    delete persistableItem.calculatedReportYear;
    return persistableItem;
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
    let accountAnalysisItems: Array<IdbAnalysisItem> = [...this.accountWorkspaceStore.facilityAnalyses()];
    let facilityAnalysisItems: Array<IdbAnalysisItem> = accountAnalysisItems.filter(item => {
      return item.facilityId == predictorToDelete.facilityId;
    });
    for (let index = 0; index < facilityAnalysisItems.length; index++) {
      let analysisItem: IdbAnalysisItem = facilityAnalysisItems[index];
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
      });
      await firstValueFrom(this.updateWithObservable(analysisItem));
    };
  }

  async addAnalysisPredictor(newPredictor: IdbPredictor) {
    let accountAnalysisItems: Array<IdbAnalysisItem> = [...this.accountWorkspaceStore.facilityAnalyses()];
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

  async updateAnalysisPredictor(predictor: IdbPredictor) {
    let accountAnalysisItems: Array<IdbAnalysisItem> = [...this.accountWorkspaceStore.facilityAnalyses()];
    let facilityAnalysisItems: Array<IdbAnalysisItem> = accountAnalysisItems.filter(item => {
      return item.facilityId == predictor.facilityId;
    });
    for (let index = 0; index < facilityAnalysisItems.length; index++) {
      let analysisItem: IdbAnalysisItem = facilityAnalysisItems[index];
      analysisItem.groups.forEach(group => {
        group.predictorVariables.forEach(pVariable => {
          if (pVariable.id == predictor.guid) {
            pVariable.name = predictor.name;
            pVariable.production = predictor.production;
            pVariable.unit = predictor.unit;
          }
        })
        if (group.models) {
          group.models.forEach(model => {
            model.predictorVariables.forEach(pVariable => {
              if (pVariable.id == predictor.guid) {
                pVariable.name = predictor.name;
                pVariable.production = predictor.production;
                pVariable.unit = predictor.unit;
              }
            })
          })
        }
      })
      await firstValueFrom(this.updateWithObservable(analysisItem));
    }
  }


  async deleteGroup(groupId: string) {
    let facilityAnalysisItems: Array<IdbAnalysisItem> = [...this.accountWorkspaceStore.selectedFacilityAnalyses()];
    for (let index = 0; index < facilityAnalysisItems.length; index++) {
      let item: IdbAnalysisItem = facilityAnalysisItems[index];
      item.groups = item.groups.filter(group => { return group.idbGroupId != groupId });
      await firstValueFrom(this.updateWithObservable(item));
    }
  }

  async addGroup(groupId: string, groupType: 'Energy' | 'Water' | 'Other') {
    let predictors: Array<IdbPredictor> = [...this.accountWorkspaceStore.facilityPredictors()];
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
    let facilityAnalysisItems: Array<IdbAnalysisItem> = [...this.accountWorkspaceStore.selectedFacilityAnalyses()];
    // add groups to analysis that are the same type..
    // water -> water, energy -> energy
    for (let index = 0; index < facilityAnalysisItems.length; index++) {
      let item: IdbAnalysisItem = facilityAnalysisItems[index];
      if (item.analysisCategory == 'energy' && groupType == 'Energy' || item.analysisCategory == 'water' && groupType == 'Water') {
        let analysisGroup: AnalysisGroup = getNewAnalysisGroup(groupId, predictorVariables);
        item.groups.push(analysisGroup);
        await firstValueFrom(this.updateWithObservable(item));
      }
    };
  }

  async deleteAllFacilityAnalysisItems(facilityId: string) {
    let accountAnalysisItems: Array<IdbAnalysisItem> = [...this.accountWorkspaceStore.facilityAnalyses()];
    let facilityAnalysisItems: Array<IdbAnalysisItem> = accountAnalysisItems.filter(analysisItem => { return analysisItem.facilityId == facilityId });
    await this.deleteAnalysisItems(facilityAnalysisItems);
  }


  async deleteAccountAnalysisItems() {
    let accountAnalysisItems: Array<IdbAnalysisItem> = [...this.accountWorkspaceStore.facilityAnalyses()];
    await this.deleteAnalysisItems(accountAnalysisItems);
  }

  async deleteAnalysisItems(analysisItems: Array<IdbAnalysisItem>) {
    for (let i = 0; i < analysisItems.length; i++) {
      this.loadingService.setLoadingMessage('Deleting Facility Analysis Items (' + i + '/' + analysisItems.length + ')...');
      await firstValueFrom(this.deleteWithObservable(analysisItems[i].id));
    }
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

  async changeGroupType(groupId: string, newGroupType: 'Energy' | 'Water' | 'Other', oldGroupType: 'Energy' | 'Water' | 'Other') {
    let predictors: Array<IdbPredictor> = [...this.accountWorkspaceStore.facilityPredictors()];
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
    let facilityAnalysisItems: Array<IdbAnalysisItem> = [...this.accountWorkspaceStore.selectedFacilityAnalyses()];
    for (let index = 0; index < facilityAnalysisItems.length; index++) {
      let item: IdbAnalysisItem = facilityAnalysisItems[index];
      if (item.analysisCategory == 'energy' && newGroupType == 'Energy' || item.analysisCategory == 'water' && newGroupType == 'Water') {
        //add group to energy analysis that didn't have it before
        //check if group already exists in analysis item groups (if changing from other to energy/water) and only add if it doesn't already exist
        let existingGroup: AnalysisGroup = item.groups.find(group => { return group.idbGroupId == groupId });
        if (!existingGroup) {
          let analysisGroup: AnalysisGroup = getNewAnalysisGroup(groupId, predictorVariables);
          item.groups.push(analysisGroup);
          await firstValueFrom(this.updateWithObservable(item));
        }
      }

      if (item.analysisCategory == 'energy' && oldGroupType == 'Energy' || item.analysisCategory == 'water' && oldGroupType == 'Water') {
        //remove group from energy analysis that shouldn't have it anymore
        item.groups = item.groups.filter(group => { return group.idbGroupId != groupId });
        await firstValueFrom(this.updateWithObservable(item));
      }
    };
  }
}
