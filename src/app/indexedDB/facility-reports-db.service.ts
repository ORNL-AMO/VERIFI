import { Injectable } from '@angular/core';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Observable } from 'rxjs';
import { IdbFacilityReport } from '../models/idbModels/facilityReport';
import { IndexedDbAccessService } from './indexed-db-access.service';

@Injectable({
  providedIn: 'root'
})
export class FacilityReportsDbService {
  constructor(private dbService: NgxIndexedDBService,
    private indexedDbAccess: IndexedDbAccessService) {
    //subscribe after initialization
  }

  getAll(): Observable<Array<IdbFacilityReport>> {
    return this.dbService.getAll('facilityReports');
  }

  async getAllFacilityReportsByAccountId(accountId: string): Promise<Array<IdbFacilityReport>> {
    return this.indexedDbAccess.getAllByIndex<IdbFacilityReport>('facilityReports', 'accountId', accountId);
  }

  getById(id: number): Observable<IdbFacilityReport> {
    return this.dbService.getByKey('facilityReports', id);
  }

  getByIndex(indexName: string, indexValue: IDBValidKey): Observable<IdbFacilityReport> {
    return this.dbService.getByIndex('facilityReports', indexName, indexValue);
  }

  getStoredByGuid(guid: string): Promise<IdbFacilityReport | undefined> {
    return this.indexedDbAccess.getByGuid<IdbFacilityReport>('facilityReports', guid);
  }

  count() {
    return this.dbService.count('facilityReports');
  }

  addWithObservable(facilityReport: IdbFacilityReport): Observable<IdbFacilityReport> {
    return this.dbService.add('facilityReports', facilityReport);
  }

  deleteWithObservable(id: number): Observable<any> {
    return this.dbService.delete('facilityReports', id);
  }

  updateWithObservable(values: IdbFacilityReport): Observable<IdbFacilityReport> {
    values.modifiedDate = new Date();
    return this.dbService.update('facilityReports', values);
  }
}
