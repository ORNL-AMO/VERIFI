import { Injectable } from '@angular/core';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Observable } from 'rxjs';
import { IdbAccountReport } from '../models/idbModels/accountReport';
import { IndexedDbAccessService } from './indexed-db-access.service';

@Injectable({
  providedIn: 'root'
})
export class AccountReportDbService {
  constructor(private dbService: NgxIndexedDBService,
    private indexedDbAccess: IndexedDbAccessService) {
    //subscribe after initialization
  }

  getAll(): Observable<Array<IdbAccountReport>> {
    return this.dbService.getAll('accountReports');
  }

  async getAllAccountReports(accountId: string): Promise<Array<IdbAccountReport>> {
    return this.indexedDbAccess.getAllByIndex<IdbAccountReport>('accountReports', 'accountId', accountId);

  }

  getById(id: number): Observable<IdbAccountReport> {
    return this.dbService.getByKey('accountReports', id);
  }

  getByIndex(indexName: string, indexValue: IDBValidKey): Observable<IdbAccountReport> {
    return this.dbService.getByIndex('accountReports', indexName, indexValue);
  }

  getStoredByGuid(guid: string): Promise<IdbAccountReport | undefined> {
    return this.indexedDbAccess.getByGuid<IdbAccountReport>('accountReports', guid);
  }

  count() {
    return this.dbService.count('accountReports');
  }

  addWithObservable(analysisItem: IdbAccountReport): Observable<IdbAccountReport> {
    return this.dbService.add('accountReports', analysisItem);
  }

  deleteWithObservable(id: number): Observable<any> {
    return this.dbService.delete('accountReports', id);
  }

  updateWithObservable(values: IdbAccountReport): Observable<IdbAccountReport> {
    values.modifiedDate = new Date();
    return this.dbService.update('accountReports', values);
  }
}
