import { Injectable } from '@angular/core';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Observable } from 'rxjs';
import { IdbCustomEmissionsItem } from '../models/idbModels/customEmissions';
import { IndexedDbAccessService } from './indexed-db-access.service';

@Injectable({
  providedIn: 'root'
})
export class CustomEmissionsDbService {
  constructor(private dbService: NgxIndexedDBService,
    private indexedDbAccess: IndexedDbAccessService) {
  }

  getAll(): Observable<Array<IdbCustomEmissionsItem>> {
    return this.dbService.getAll('customEmissionsItems');
  }

  async getAllAccountCustomEmissions(accountId: string): Promise<Array<IdbCustomEmissionsItem>> {
    return this.indexedDbAccess.getAllByIndex<IdbCustomEmissionsItem>(
      'customEmissionsItems',
      'accountId',
      accountId
    );
  }

  getById(id: number): Observable<IdbCustomEmissionsItem> {
    return this.dbService.getByKey('customEmissionsItems', id);
  }

  getByIndex(indexName: string, indexValue: IDBValidKey): Observable<IdbCustomEmissionsItem> {
    return this.dbService.getByIndex('customEmissionsItems', indexName, indexValue);
  }

  getStoredByGuid(guid: string): Promise<IdbCustomEmissionsItem | undefined> {
    return this.indexedDbAccess.getByGuid<IdbCustomEmissionsItem>('customEmissionsItems', guid);
  }

  count() {
    return this.dbService.count('customEmissionsItems');
  }

  addWithObservable(emissionsItem: IdbCustomEmissionsItem): Observable<IdbCustomEmissionsItem> {
    return this.dbService.add('customEmissionsItems', emissionsItem);
  }

  deleteWithObservable(id: number): Observable<any> {
    return this.dbService.delete('customEmissionsItems', id);
  }

  updateWithObservable(values: IdbCustomEmissionsItem): Observable<IdbCustomEmissionsItem> {
    values.date = new Date();
    return this.dbService.update('customEmissionsItems', values);
  }
}
