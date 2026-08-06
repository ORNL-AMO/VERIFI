import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Injectable, inject } from '@angular/core';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Observable } from 'rxjs';
import { IdbFacilityReport } from '../models/idbModels/facilityReport';
import { LoadingService } from '../core-components/loading/loading.service';
import { IndexedDbAccessService } from './indexed-db-access.service';

@Injectable({
  providedIn: 'root'
})
export class FacilityReportsDbService {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  constructor(private dbService: NgxIndexedDBService,
    private loadingService: LoadingService,
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

  async deleteFacilityReports(facilityId: string) {
    let accountFacilityReports: Array<IdbFacilityReport> = [...this.accountWorkspaceStore.facilityReports()];
    let facilityReports: Array<IdbFacilityReport> = accountFacilityReports.filter(report => {
      return report.facilityId == facilityId;
    });
    await this.deleteReports(facilityReports);
  }

  async deleteReports(facilityReports: Array<IdbFacilityReport>) {
    for (let i = 0; i < facilityReports.length; i++) {
      this.loadingService.setLoadingMessage('Deleting Reports (' + i + '/' + facilityReports.length + ')...');
      await this.deleteWithObservable(facilityReports[i].id);
    }
  }

  getByGuid(guid: string): IdbFacilityReport {
    let accountFacilityReports: Array<IdbFacilityReport> = [...this.accountWorkspaceStore.facilityReports()];
    return accountFacilityReports.find(report => {
      return report.guid == guid;
    })
  }

  getReportName(reportId: string): string {
    let report: IdbFacilityReport = this.getByGuid(reportId);
    if(report){
      return report.name;
    }
    return '';
  }
}
