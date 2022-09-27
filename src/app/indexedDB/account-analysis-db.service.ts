import { Injectable } from '@angular/core';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { LocalStorageService } from 'ngx-webstorage';
import { BehaviorSubject, Observable } from 'rxjs';
import { IdbAccount, IdbAccountAnalysisItem, IdbFacility } from '../models/idb';
import { AccountdbService } from './account-db.service';
import { FacilitydbService } from './facility-db.service';

@Injectable({
  providedIn: 'root'
})
export class AccountAnalysisDbService {

  accountAnalysisItems: BehaviorSubject<Array<IdbAccountAnalysisItem>>;
  selectedAnalysisItem: BehaviorSubject<IdbAccountAnalysisItem>;

  constructor(private dbService: NgxIndexedDBService, private localStorageService: LocalStorageService,
    private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService) {
    this.accountAnalysisItems = new BehaviorSubject<Array<IdbAccountAnalysisItem>>([]);
    this.selectedAnalysisItem = new BehaviorSubject<IdbAccountAnalysisItem>(undefined);

    //subscribe after initialization
    this.selectedAnalysisItem.subscribe(analysisItem => {
      if (analysisItem) {
        this.localStorageService.store('accountAnalysisItemsId', analysisItem.id);
      }
    });
  }

  getInitialAnalysisItem(): number {
    let analysisItemId: number = this.localStorageService.retrieve("accountAnalysisItemsId");
    return analysisItemId;
  }

  getAll(): Observable<Array<IdbAccountAnalysisItem>> {
    return this.dbService.getAll('accountAnalysisItems');
  }

  getById(id: number): Observable<IdbAccountAnalysisItem> {
    return this.dbService.getByKey('accountAnalysisItems', id);
  }

  getByIndex(indexName: string, indexValue: number): Observable<IdbAccountAnalysisItem> {
    return this.dbService.getByIndex('accountAnalysisItems', indexName, indexValue);
  }

  getAllByIndexRange(indexName: string, indexValue: number | string): Observable<Array<IdbAccountAnalysisItem>> {
    let idbKeyRange: IDBKeyRange = IDBKeyRange.only(indexValue);
    return this.dbService.getAllByIndex('accountAnalysisItems', indexName, idbKeyRange);
  }

  count() {
    return this.dbService.count('accountAnalysisItems');
  }

  addWithObservable(analysisItem: IdbAccountAnalysisItem): Observable<IdbAccountAnalysisItem> {
    return this.dbService.add('accountAnalysisItems', analysisItem);
  }

  deleteWithObservable(id: number): Observable<any> {
    return this.dbService.delete('accountAnalysisItems', id);
  }

  updateWithObservable(values: IdbAccountAnalysisItem): Observable<IdbAccountAnalysisItem> {
    values.date = new Date();
    return this.dbService.update('accountAnalysisItems', values);
  }

  getNewAccountAnalysisItem(): IdbAccountAnalysisItem {
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let facilityAnalysisItems: Array<{
      facilityId: string,
      analysisItemId: string
    }> = new Array();
    accountFacilities.forEach(facility => {
      facilityAnalysisItems.push({
        facilityId: facility.guid,
        analysisItemId: undefined
      })
    })
    return {
      accountId: selectedAccount.guid,
      guid: Math.random().toString(36).substr(2, 9),
      date: new Date(),
      name: 'Account Analysis',
      // energyIsSource: selectedAccount.energyIsSource,
      reportYear: selectedAccount.sustainabilityQuestions.energyReductionTargetYear,
      energyUnit: selectedAccount.energyUnit,
      facilityAnalysisItems: facilityAnalysisItems,
      energyIsSource: selectedAccount.energyIsSource,
      hasBaselineAdjustement: false,
      baselineAdjustments: []
    }
  }


  async deleteAccountAnalysisItems() {
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisItems.getValue();
    await this.deleteAnalysisItems(accountAnalysisItems);
  }

  async deleteAnalysisItems(analysisItems: Array<IdbAccountAnalysisItem>) {
    for (let i = 0; i < analysisItems.length; i++) {
      await this.deleteWithObservable(analysisItems[i].id);
    }
  }

 async updateFacilityItemSelection(analysiItem: IdbAccountAnalysisItem, analysisItemId: string, facilityId: string) {
    analysiItem.facilityAnalysisItems.forEach(item => {
      if (item.facilityId == facilityId) {
        item.analysisItemId = analysisItemId;
      }
    });
    await this.updateWithObservable(analysiItem).toPromise();
    this.selectedAnalysisItem.next(analysiItem);
  }
}
