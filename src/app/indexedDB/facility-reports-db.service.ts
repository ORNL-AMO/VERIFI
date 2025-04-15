import { Injectable } from '@angular/core';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { LocalStorageService } from 'ngx-webstorage';
import { BehaviorSubject, firstValueFrom, Observable, Subject } from 'rxjs';
import { IdbFacilityReport } from '../models/idbModels/facilityReport';
import { LoadingService } from '../core-components/loading/loading.service';

@Injectable({
  providedIn: 'root'
})
export class FacilityReportsDbService {

  accountFacilityReports: BehaviorSubject<Array<IdbFacilityReport>>;
  facilityReports: BehaviorSubject<Array<IdbFacilityReport>>;
  selectedReport: BehaviorSubject<IdbFacilityReport>;
  
  // errorMessage = new Subject<string>();
  // errorMessage$ = this.errorMessage.asObservable();

  constructor(private dbService: NgxIndexedDBService, private localStorageService: LocalStorageService,
    private loadingService: LoadingService) {
    this.accountFacilityReports = new BehaviorSubject<Array<IdbFacilityReport>>([]);
    this.facilityReports = new BehaviorSubject<Array<IdbFacilityReport>>([]);
    this.selectedReport = new BehaviorSubject<IdbFacilityReport>(undefined);
    //subscribe after initialization
    this.selectedReport.subscribe(analysisItem => {
      if (analysisItem) {
        this.localStorageService.store('facilityReportId', analysisItem.id);
      }
    });

    // store error message in local storage for browser reload case
    // const message = localStorage.getItem('errorMessage');
    // if (message) {
    //   this.errorMessage.next(message);
    // }
  }

  // setErrorMessage(message: string) {
  //   this.errorMessage.next(message);
  //   localStorage.setItem('errorMessage', message);
  // }

  // clearMessage() {
  //   this.errorMessage.next(null);
  //   localStorage.removeItem('errorMessage');
  // }

  getInitialReport(): number {
    let reportId: number = this.localStorageService.retrieve("facilityReportId");
    return reportId;
  }

  getAll(): Observable<Array<IdbFacilityReport>> {
    return this.dbService.getAll('facilityReports');
  }

  async getAllFacilityReportsByAccountId(accountId: string): Promise<Array<IdbFacilityReport>> {
    let allReports: Array<IdbFacilityReport> = await firstValueFrom(this.getAll())
    let accountFacilityReports: Array<IdbFacilityReport> = allReports.filter(report => { return report.accountId == accountId });
    return accountFacilityReports;
  }

  getById(id: number): Observable<IdbFacilityReport> {
    return this.dbService.getByKey('facilityReports', id);
  }

  getByIndex(indexName: string, indexValue: number): Observable<IdbFacilityReport> {
    return this.dbService.getByIndex('facilityReports', indexName, indexValue);
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
    let accountFacilityReports: Array<IdbFacilityReport> = this.accountFacilityReports.getValue();
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
    let accountFacilityReports: Array<IdbFacilityReport> = this.accountFacilityReports.getValue();
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
