import { Injectable } from '@angular/core';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { LocalStorageService } from 'ngx-webstorage';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { AnalysisDbService } from './analysis-db.service';
import { AnalysisValidationService } from '../shared/helper-services/analysis-validation.service';
import { LoadingService } from '../core-components/loading/loading.service';
import { IdbAccountAnalysisItem } from '../models/idbModels/accountAnalysisItem';
import { IdbAnalysisItem } from '../models/idbModels/analysisItem';

@Injectable({
  providedIn: 'root'
})
export class AccountAnalysisDbService {

  accountAnalysisItems: BehaviorSubject<Array<IdbAccountAnalysisItem>>;
  selectedAnalysisItem: BehaviorSubject<IdbAccountAnalysisItem>;

  constructor(private dbService: NgxIndexedDBService, private localStorageService: LocalStorageService,
    private analysisDbService: AnalysisDbService,
    private analysisValidationService: AnalysisValidationService,
    private loadingService: LoadingService) {
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

  async getAllAccountAnalysisItems(accountId: string): Promise<Array<IdbAccountAnalysisItem>> {
    let allAnalysisItesm: Array<IdbAccountAnalysisItem> = await firstValueFrom(this.getAll())
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = allAnalysisItesm.filter(item => { return item.accountId == accountId });
    return accountAnalysisItems;
  }

  getById(id: number): Observable<IdbAccountAnalysisItem> {
    return this.dbService.getByKey('accountAnalysisItems', id);
  }

  getByIndex(indexName: string, indexValue: number): Observable<IdbAccountAnalysisItem> {
    return this.dbService.getByIndex('accountAnalysisItems', indexName, indexValue);
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
    values.modifiedDate = new Date();
    return this.dbService.update('accountAnalysisItems', values);
  }

  async deleteAccountAnalysisItems() {
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisItems.getValue();
    await this.deleteAnalysisItems(accountAnalysisItems);
  }

  async deleteAnalysisItems(analysisItems: Array<IdbAccountAnalysisItem>) {
    for (let i = 0; i < analysisItems.length; i++) {
      this.loadingService.setLoadingMessage('Deleting Account Analysis Items (' + i + '/' + analysisItems.length + ')...');
      await firstValueFrom(this.deleteWithObservable(analysisItems[i].id));
    }
  }

  async updateFacilityItemSelection(analysiItem: IdbAccountAnalysisItem, analysisItemId: string, facilityId: string) {
    analysiItem.facilityAnalysisItems.forEach(item => {
      if (item.facilityId == facilityId) {
        item.analysisItemId = analysisItemId;
      }
    });
    let analysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    analysiItem.setupErrors = this.analysisValidationService.getAccountAnalysisSetupErrors(analysiItem, analysisItems);
    await firstValueFrom(this.updateWithObservable(analysiItem));
    this.selectedAnalysisItem.next(analysiItem);
  }

  async updateAccountValidation(allAnalysisItems: Array<IdbAnalysisItem>) {
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisItems.getValue();
    let hasChanges: boolean = false;
    for (let i = 0; i < accountAnalysisItems.length; i++) {
      let item: IdbAccountAnalysisItem = accountAnalysisItems[i];
      let results: { analysisItem: IdbAccountAnalysisItem, isChanged: boolean } = this.analysisValidationService.updateFacilitySelectionErrors(item, allAnalysisItems);
      if (results.isChanged) {
        accountAnalysisItems[i] = results.analysisItem;
        await firstValueFrom(this.updateWithObservable(accountAnalysisItems[i]));
        hasChanges = true;
      }
    }
    if (hasChanges) {
      this.accountAnalysisItems.next(accountAnalysisItems);
    }
  }

  getCorrespondingAccountAnalysisItems(facilityAnalysisItemId: string): Array<IdbAccountAnalysisItem> {
    let allAccountAnalysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisItems.getValue();
    let correspondingItems: Array<IdbAccountAnalysisItem> = new Array();
    allAccountAnalysisItems.forEach(accountItem => {
      accountItem.facilityAnalysisItems.forEach(facilityItem => {
        if (facilityItem.analysisItemId == facilityAnalysisItemId) {
          correspondingItems.push(accountItem);
        }
      });
    });
    return correspondingItems;
  }

  getByGuid(itemId: string): IdbAccountAnalysisItem {
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisItems.getValue();
    let item: IdbAccountAnalysisItem = accountAnalysisItems.find(accItem => { return accItem.guid == itemId });
    return item;
  }

  getAccountAnalysisName(itemId: string): string {
    let item: IdbAccountAnalysisItem = this.getByGuid(itemId);
    if(item){
      return item.name
    };
    return '';
  }
}
