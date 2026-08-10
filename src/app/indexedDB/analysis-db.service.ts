import { Injectable } from '@angular/core';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Observable } from 'rxjs';
import { IdbAnalysisItem } from '../models/idbModels/analysisItem';
import { IndexedDbAccessService } from './indexed-db-access.service';

@Injectable({
  providedIn: 'root'
})
export class AnalysisDbService {
  constructor(
    private dbService: NgxIndexedDBService,
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
}
