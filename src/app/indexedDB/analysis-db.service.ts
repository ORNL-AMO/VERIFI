import { Injectable } from '@angular/core';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { LocalStorageService } from 'ngx-webstorage';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { IdbAccount, IdbAnalysisItem, IdbFacility, IdbUtilityMeterGroup, PredictorData } from '../models/idb';
import { AccountdbService } from './account-db.service';
import { FacilitydbService } from './facility-db.service';
import { PredictordbService } from './predictors-db.service';
import { UtilityMeterGroupdbService } from './utilityMeterGroup-db.service';
import * as _ from 'lodash';
import { AnalysisCategory, AnalysisGroup } from '../models/analysis';
import { AnalysisValidationService } from '../shared/helper-services/analysis-validation.service';
import { LoadingService } from '../core-components/loading/loading.service';

@Injectable({
  providedIn: 'root'
})
export class AnalysisDbService {

  accountAnalysisItems: BehaviorSubject<Array<IdbAnalysisItem>>;
  facilityAnalysisItems: BehaviorSubject<Array<IdbAnalysisItem>>;
  selectedAnalysisItem: BehaviorSubject<IdbAnalysisItem>;

  constructor(private dbService: NgxIndexedDBService, private localStorageService: LocalStorageService,
    private facilityDbService: FacilitydbService, private accountDbService: AccountdbService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private predictorDbService: PredictordbService,
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
    values.date = new Date();
    return this.dbService.update('analysisItems', values);
  }

  getNewAnalysisItem(analysisCategory: AnalysisCategory, facilityId: string): IdbAnalysisItem {
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let selectedFacility: IdbFacility = facilities.find(filter => { return filter.guid == facilityId });
    let accountMeterGroups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupDbService.accountMeterGroups.getValue();
    let facilityMeterGroups: Array<IdbUtilityMeterGroup> = accountMeterGroups.filter(group => { return group.facilityId == facilityId });
    let itemGroups: Array<AnalysisGroup> = new Array();
    let predictors: Array<PredictorData> = this.predictorDbService.facilityPredictors.getValue();
    facilityMeterGroups.forEach(group => {
      let groupTypeNeeded: 'Energy' | 'Water';
      if (analysisCategory == 'energy') {
        groupTypeNeeded = 'Energy';
      } else if (analysisCategory == 'water') {
        groupTypeNeeded = 'Water';
      }
      if (group.groupType == groupTypeNeeded) {
        let predictorVariables: Array<PredictorData> = JSON.parse(JSON.stringify(predictors));
        let analysisGroup: AnalysisGroup = {
          idbGroupId: group.guid,
          analysisType: 'regression',
          predictorVariables: predictorVariables.map(variable => {
            variable.productionInAnalysis = true;
            return variable
          }),
          regressionModelYear: undefined,
          regressionConstant: undefined,
          groupErrors: undefined,
          specifiedMonthlyPercentBaseload: false,
          averagePercentBaseload: undefined,
          monthlyPercentBaseload: this.getMonthlyPercentBaseload(),
          hasDataAdjustement: false,
          dataAdjustments: [],
          userDefinedModel: true,
          models: undefined,
          hasBaselineAdjustmentV2: false,
          baselineAdjustmentsV2: [],
          maxModelVariables: 4
        }
        analysisGroup.groupErrors = this.analysisValidationService.getGroupErrors(analysisGroup);
        itemGroups.push(analysisGroup);
      }
    });

    let baselineYear: number;
    let name: string;
    if (analysisCategory == 'energy') {
      baselineYear = selectedFacility.sustainabilityQuestions.energyReductionBaselineYear
      name = 'Energy Analysis';
    } else if (analysisCategory == 'water') {
      baselineYear = selectedFacility.sustainabilityQuestions.waterReductionBaselineYear
      name = 'Water Analysis';
    }

    let analysisItem: IdbAnalysisItem = {
      facilityId: selectedFacility.guid,
      accountId: selectedAccount.guid,
      guid: Math.random().toString(36).substr(2, 9),
      date: new Date(),
      name: name,
      reportYear: undefined,
      energyIsSource: selectedFacility.energyIsSource,
      energyUnit: selectedFacility.energyUnit,
      waterUnit: selectedFacility.volumeLiquidUnit,
      groups: itemGroups,
      setupErrors: undefined,
      analysisCategory: analysisCategory,
      baselineYear: baselineYear
    };
    analysisItem.setupErrors = this.analysisValidationService.getAnalysisItemErrors(analysisItem);
    return analysisItem;
  }

  getUnits(predictorVariables: Array<PredictorData>): string {
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


  async updateAnalysisPredictors(predictorEntries: Array<PredictorData>, facilityId: string, predictorUsedGroupIds?: Array<string>) {
    let accountAnalysisItems: Array<IdbAnalysisItem> = this.accountAnalysisItems.getValue();
    let facilityAnalysisItems: Array<IdbAnalysisItem> = accountAnalysisItems.filter(item => { return item.facilityId == facilityId });
    for (let index = 0; index < facilityAnalysisItems.length; index++) {
      let analysisItem: IdbAnalysisItem = facilityAnalysisItems[index];
      let hasGroupErrors: boolean = false;
      analysisItem.groups.forEach(group => {
        let groupUpdates: { predictors: Array<PredictorData>, deletedPredictor: boolean } = this.updatePredictorVariables(predictorEntries, group.predictorVariables);
        group.predictorVariables = groupUpdates.predictors;
        if (groupUpdates.deletedPredictor && group.analysisType == 'regression' && predictorUsedGroupIds.includes(group.idbGroupId)) {
          group.models = undefined;
          group.selectedModelId = undefined;
          group.regressionModelYear = undefined;
          group.regressionConstant = undefined;
          group.dateModelsGenerated = undefined;
        }
        group.groupErrors = this.analysisValidationService.getGroupErrors(group);
        if (group.groupErrors.hasErrors) {
          hasGroupErrors = true;
        }
      });
      analysisItem.setupErrors.groupsHaveErrors = hasGroupErrors;
      await firstValueFrom(this.updateWithObservable(analysisItem));
    };
  }

  updatePredictorVariables(predictorEntries: Array<PredictorData>, analysisPredictors: Array<PredictorData>): { predictors: Array<PredictorData>, deletedPredictor: boolean } {
    let predictorIdsToRemove: Array<string> = new Array();
    //update existing, check need remove
    analysisPredictors.forEach(predictor => {
      let checkExists: PredictorData = predictorEntries.find(entry => { return entry.id == predictor.id });
      if (!checkExists) {
        predictorIdsToRemove.push(predictor.id)
      } else {
        predictor.name = checkExists.name;
        predictor.unit = checkExists.unit;
        predictor.production = checkExists.production;
      }
    });
    //remove necessary predictors
    analysisPredictors = analysisPredictors.filter(predictor => { return !predictorIdsToRemove.includes(predictor.id) });
    //add new predictors
    predictorEntries.forEach(entry => {
      let checkExists: PredictorData = analysisPredictors.find(predictor => { return predictor.id == entry.id });
      if (!checkExists) {
        analysisPredictors.push(entry);
      }
    });
    return { predictors: analysisPredictors, deletedPredictor: predictorIdsToRemove.length != 0 };
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
    let predictors: Array<PredictorData> = this.predictorDbService.facilityPredictors.getValue();
    let predictorVariables: Array<PredictorData> = JSON.parse(JSON.stringify(predictors));
    predictorVariables.forEach(variable => {
      variable.productionInAnalysis = variable.production;
    });
    let facilityAnalysisItems: Array<IdbAnalysisItem> = this.facilityAnalysisItems.getValue();
    for (let index = 0; index < facilityAnalysisItems.length; index++) {
      let item: IdbAnalysisItem = facilityAnalysisItems[index];
      let analysisGroup: AnalysisGroup = {
        idbGroupId: groupId,
        analysisType: 'energyIntensity',
        predictorVariables: predictorVariables,
        regressionConstant: undefined,
        regressionModelYear: undefined,
        groupErrors: undefined,
        specifiedMonthlyPercentBaseload: false,
        averagePercentBaseload: undefined,
        monthlyPercentBaseload: this.getMonthlyPercentBaseload(),
        hasDataAdjustement: false,
        dataAdjustments: [],
        userDefinedModel: false,
        hasBaselineAdjustmentV2: false,
        baselineAdjustmentsV2: [],
        maxModelVariables: 4
      }
      analysisGroup.groupErrors = this.analysisValidationService.getGroupErrors(analysisGroup);
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
      this.loadingService.setLoadingMessage('Deleting Facility Analysis Items (' + i + '/' + analysisItems.length + ')...' );
      await firstValueFrom(this.deleteWithObservable(analysisItems[i].id));
    }
  }

  getMonthlyPercentBaseload(): Array<{ monthNum: number, percent: number }> {
    let values: Array<{ monthNum: number, percent: number }> = new Array();
    for (let i = 0; i < 12; i++) {
      values.push({
        monthNum: i,
        percent: undefined
      })
    }
    return values;
  }
}
