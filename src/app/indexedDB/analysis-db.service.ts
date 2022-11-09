import { Injectable } from '@angular/core';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { LocalStorageService } from 'ngx-webstorage';
import { BehaviorSubject, Observable } from 'rxjs';
import { AnalysisGroup, IdbAccount, IdbAnalysisItem, IdbFacility, IdbPredictorEntry, IdbUtilityMeterGroup, PredictorData } from '../models/idb';
import { AccountdbService } from './account-db.service';
import { FacilitydbService } from './facility-db.service';
import { PredictordbService } from './predictors-db.service';
import { UtilityMeterGroupdbService } from './utilityMeterGroup-db.service';
import * as _ from 'lodash';
import { AnalysisValidationService } from '../facility/analysis/analysis-validation.service';

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
    private analysisValidationService: AnalysisValidationService) {
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
      let accounAnalysisItems: Array<IdbAnalysisItem> = await this.getAllByIndexRange('accountId', selectedAccount.guid).toPromise();
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

  // setAccountAnalysisItems() {
  //   let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
  //   if (selectedAccount) {
  //     this.getAllByIndexRange('accountId', selectedAccount.guid).subscribe((analysisItems: Array<IdbAnalysisItem>) => {
  //       this.accountAnalysisItems.next(analysisItems);
  //       let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
  //       if (selectedFacility) {
  //         let facilityAnalysisItems: Array<IdbAnalysisItem> = analysisItems.filter(item => { return item.facilityId == selectedFacility.guid });
  //         this.facilityAnalysisItems.next(facilityAnalysisItems);
  //       }else{
  //         this.facilityAnalysisItems.next([]);
  //       }
  //     });
  //   }
  // }

  getAll(): Observable<Array<IdbAnalysisItem>> {
    return this.dbService.getAll('analysisItems');
  }

  getById(id: number): Observable<IdbAnalysisItem> {
    return this.dbService.getByKey('analysisItems', id);
  }

  getByIndex(indexName: string, indexValue: number): Observable<IdbAnalysisItem> {
    return this.dbService.getByIndex('analysisItems', indexName, indexValue);
  }

  getAllByIndexRange(indexName: string, indexValue: number | string): Observable<Array<IdbAnalysisItem>> {
    let idbKeyRange: IDBKeyRange = IDBKeyRange.only(indexValue);
    return this.dbService.getAllByIndex('analysisItems', indexName, idbKeyRange);
  }

  count() {
    return this.dbService.count('analysisItems');
  }

  // add(analysisItems: IdbAnalysisItem): void {
  //   this.dbService.add('analysisItems', analysisItems).subscribe(() => {
  //     this.setAccountAnalysisItems();
  //   });
  // }

  addWithObservable(analysisItem: IdbAnalysisItem): Observable<IdbAnalysisItem> {
    return this.dbService.add('analysisItems', analysisItem);
  }

  deleteWithObservable(id: number): Observable<any> {
    return this.dbService.delete('analysisItems', id);
  }

  // update(values: IdbAnalysisItem): void {
  //   values.date = new Date();
  //   this.dbService.update('analysisItems', values).subscribe(() => {
  //     this.setAccountAnalysisItems();
  //   });
  // }

  updateWithObservable(values: IdbAnalysisItem): Observable<IdbAnalysisItem> {
    values.date = new Date();
    return this.dbService.update('analysisItems', values);
  }

  // deleteById(analysisItemId: number): void {
  //   this.dbService.delete('analysisItems', analysisItemId).subscribe(() => {
  //     this.setAccountAnalysisItems();
  //   });
  // }

  getNewAnalysisItem(): IdbAnalysisItem {
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let facilityMeterGroups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupDbService.facilityMeterGroups.getValue();
    let itemGroups: Array<AnalysisGroup> = new Array();
    let predictors: Array<PredictorData> = this.predictorDbService.facilityPredictors.getValue();
    facilityMeterGroups.forEach(group => {
      if (group.groupType == 'Energy') {
        let predictorVariables: Array<PredictorData> = JSON.parse(JSON.stringify(predictors));
        predictorVariables.forEach(variable => {
          variable.productionInAnalysis = variable.production;
        });
        let analysisGroup: AnalysisGroup = {
          idbGroupId: group.guid,
          analysisType: 'energyIntensity',
          predictorVariables: JSON.parse(JSON.stringify(predictorVariables)),
          productionUnits: this.getUnits(predictorVariables),
          regressionModelYear: undefined,
          regressionConstant: undefined,
          groupErrors: undefined,
          specifiedMonthlyPercentBaseload: false,
          averagePercentBaseload: undefined,
          monthlyPercentBaseload: this.getMonthlyPercentBaseload(),
          hasBaselineAdjustement: false,
          baselineAdjustments: [],
          userDefinedModel: false
        }
        analysisGroup.groupErrors = this.analysisValidationService.getGroupErrors(analysisGroup);
        itemGroups.push(analysisGroup);
      }
    });

    let analysisItem: IdbAnalysisItem = {
      facilityId: selectedFacility.guid,
      accountId: selectedAccount.guid,
      guid: Math.random().toString(36).substr(2, 9),
      date: new Date(),
      name: 'Analysis Item',
      reportYear: undefined,
      energyIsSource: selectedFacility.energyIsSource,
      energyUnit: selectedFacility.energyUnit,
      groups: itemGroups,
      setupErrors: undefined
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


  async updateAnalysisPredictors(predictorEntries: Array<PredictorData>) {
    let facilityAnalysisItems: Array<IdbAnalysisItem> = this.facilityAnalysisItems.getValue();
    for (let index = 0; index < facilityAnalysisItems.length; index++) {
      let analysisItem: IdbAnalysisItem = facilityAnalysisItems[index];
      analysisItem.groups.forEach(group => {
        group.predictorVariables = this.updatePredictorVariables(predictorEntries, group.predictorVariables);
        group.groupErrors = this.analysisValidationService.getGroupErrors(group);
      });
      await this.updateWithObservable(analysisItem).toPromise();
    };
  }

  updatePredictorVariables(predictorEntries: Array<PredictorData>, analysisPredictors: Array<PredictorData>): Array<PredictorData> {
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
        if (predictor.productionInAnalysis && !checkExists.production) {
          predictor.productionInAnalysis = false;
        }
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
    return analysisPredictors;
  }


  async deleteGroup(groupId: string) {
    let facilityAnalysisItems: Array<IdbAnalysisItem> = this.facilityAnalysisItems.getValue();
    for (let index = 0; index < facilityAnalysisItems.length; index++) {
      let item: IdbAnalysisItem = facilityAnalysisItems[index];
      item.groups = item.groups.filter(group => { return group.idbGroupId != groupId });
      await this.updateWithObservable(item).toPromise();
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
        productionUnits: this.getUnits(predictorVariables),
        regressionConstant: undefined,
        regressionModelYear: undefined,
        groupErrors: undefined,
        specifiedMonthlyPercentBaseload: false,
        averagePercentBaseload: undefined,
        monthlyPercentBaseload: this.getMonthlyPercentBaseload(),
        hasBaselineAdjustement: false,
        baselineAdjustments: [],
        userDefinedModel: false
      }
      analysisGroup.groupErrors = this.analysisValidationService.getGroupErrors(analysisGroup);
      item.groups.push(analysisGroup);
      await this.updateWithObservable(item).toPromise();
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
      await this.deleteWithObservable(analysisItems[i].id).toPromise();
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
