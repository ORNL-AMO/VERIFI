import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { IdbCustomGWP } from '../models/idbModels/customGWP';
import { IndexedDbAccessService } from './indexed-db-access.service';

@Injectable({
  providedIn: 'root'
})
export class CustomGWPDbService {
  constructor(private dbService: NgxIndexedDBService,
    private indexedDbAccess: IndexedDbAccessService) {
  }

  getAll(): Observable<Array<IdbCustomGWP>> {
    return this.dbService.getAll('customGWP');
  }

  async getAllAccountCustomGWP(accountId: string): Promise<Array<IdbCustomGWP>> {
    return this.indexedDbAccess.getAllByIndex<IdbCustomGWP>('customGWP', 'accountId', accountId);
  }

  getById(id: number): Observable<IdbCustomGWP> {
    return this.dbService.getByKey('customGWP', id);
  }

  getByIndex(indexName: string, indexValue: IDBValidKey): Observable<IdbCustomGWP> {
    return this.dbService.getByIndex('customGWP', indexName, indexValue);
  }

  getStoredByGuid(guid: string): Promise<IdbCustomGWP | undefined> {
    return this.indexedDbAccess.getByGuid<IdbCustomGWP>('customGWP', guid);
  }

  count() {
    return this.dbService.count('customGWP');
  }

  addWithObservable(emissionsItem: IdbCustomGWP): Observable<IdbCustomGWP> {
    return this.dbService.add('customGWP', emissionsItem);
  }

  deleteWithObservable(id: number): Observable<any> {
    return this.dbService.delete('customGWP', id);
  }

  updateWithObservable(values: IdbCustomGWP): Observable<IdbCustomGWP> {
    values.date = new Date();
    return this.dbService.update('customGWP', values);
  }

}
