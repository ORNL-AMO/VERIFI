import { Injectable } from '@angular/core';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Observable } from 'rxjs';
import { IdbAccountAnalysisItem } from '../models/idbModels/accountAnalysisItem';
import { IndexedDbAccessService } from './indexed-db-access.service';

@Injectable({
  providedIn: 'root'
})
export class AccountAnalysisDbService {
  constructor(private dbService: NgxIndexedDBService,
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
}
