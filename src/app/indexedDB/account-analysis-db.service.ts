import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Injectable, inject } from '@angular/core';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Observable, firstValueFrom } from 'rxjs';
import { LoadingService } from '../core-components/loading/loading.service';
import { IdbAccountAnalysisItem } from '../models/idbModels/accountAnalysisItem';
import { IndexedDbAccessService } from './indexed-db-access.service';

@Injectable({
  providedIn: 'root'
})
export class AccountAnalysisDbService {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  constructor(private dbService: NgxIndexedDBService,
    private loadingService: LoadingService,
    private indexedDbAccess: IndexedDbAccessService) {
    //subscribe after initialization
  }

  getAll(): Observable<Array<IdbAccountAnalysisItem>> {
    return this.dbService.getAll('accountAnalysisItems');
  }

  async getAllAccountAnalysisItems(accountId: string): Promise<Array<IdbAccountAnalysisItem>> {
    return this.indexedDbAccess.getAllByIndex<IdbAccountAnalysisItem>(
      'accountAnalysisItems',
      'accountId',
      accountId
    );
  }

  getById(id: number): Observable<IdbAccountAnalysisItem> {
    return this.dbService.getByKey('accountAnalysisItems', id);
  }

  getByIndex(indexName: string, indexValue: IDBValidKey): Observable<IdbAccountAnalysisItem> {
    return this.dbService.getByIndex('accountAnalysisItems', indexName, indexValue);
  }

  getStoredByGuid(guid: string): Promise<IdbAccountAnalysisItem | undefined> {
    return this.indexedDbAccess.getByGuid<IdbAccountAnalysisItem>('accountAnalysisItems', guid);
  }

  count() {
    return this.dbService.count('accountAnalysisItems');
  }

  addWithObservable(analysisItem: IdbAccountAnalysisItem): Observable<IdbAccountAnalysisItem> {
    return this.dbService.add('accountAnalysisItems', this.getPersistableAnalysisItem(analysisItem));
  }

  deleteWithObservable(id: number): Observable<any> {
    return this.dbService.delete('accountAnalysisItems', id);
  }

  updateWithObservable(values: IdbAccountAnalysisItem): Observable<IdbAccountAnalysisItem> {
    values.modifiedDate = new Date();
    return this.dbService.update('accountAnalysisItems', this.getPersistableAnalysisItem(values));
  }

  private getPersistableAnalysisItem(analysisItem: IdbAccountAnalysisItem): IdbAccountAnalysisItem {
    const persistableItem = { ...analysisItem } as IdbAccountAnalysisItem & { calculatedReportYear?: number };
    delete persistableItem.calculatedReportYear;
    return persistableItem;
  }

  async deleteAccountAnalysisItems() {
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = [...this.accountWorkspaceStore.accountAnalyses()];
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
    await firstValueFrom(this.updateWithObservable(analysiItem));
  }

  getCorrespondingAccountAnalysisItems(facilityAnalysisItemId: string): Array<IdbAccountAnalysisItem> {
    let allAccountAnalysisItems: Array<IdbAccountAnalysisItem> = [...this.accountWorkspaceStore.accountAnalyses()];
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
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = [...this.accountWorkspaceStore.accountAnalyses()];
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
