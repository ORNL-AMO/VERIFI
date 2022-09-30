import { Injectable } from '@angular/core';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { LocalStorageService } from 'ngx-webstorage';
import { BehaviorSubject, Observable } from 'rxjs';
import { IdbOverviewReportOptions } from '../models/idb';

@Injectable({
  providedIn: 'root'
})
export class OverviewReportOptionsDbService {

  accountOverviewReportOptions: BehaviorSubject<Array<IdbOverviewReportOptions>>;
  selectedOverviewReportOptions: BehaviorSubject<IdbOverviewReportOptions>;
  overviewReportOptionsTemplates: BehaviorSubject<Array<IdbOverviewReportOptions>>;
  constructor(private dbService: NgxIndexedDBService, private localStorageService: LocalStorageService) {
    this.accountOverviewReportOptions = new BehaviorSubject<Array<IdbOverviewReportOptions>>(new Array());
    this.overviewReportOptionsTemplates = new BehaviorSubject<Array<IdbOverviewReportOptions>>(new Array());
    this.selectedOverviewReportOptions = new BehaviorSubject<IdbOverviewReportOptions>(undefined);

    //subscribe after initialization
    this.selectedOverviewReportOptions.subscribe(overviewReportOptions => {
      if (overviewReportOptions) {
        this.localStorageService.store('overviewReportOptionsId', overviewReportOptions.id);
      }
    });
  }

  getInitialReport(): number {
    let overviewReportOptionsId: number = this.localStorageService.retrieve("overviewReportOptionsId");
    return overviewReportOptionsId;
  }

  getAll(): Observable<Array<IdbOverviewReportOptions>> {
    return this.dbService.getAll('overviewReportOptions');
  }

  getById(id: number): Observable<IdbOverviewReportOptions> {
    return this.dbService.getByKey('overviewReportOptions', id);
  }

  getByIndex(indexName: string, indexValue: number): Observable<IdbOverviewReportOptions> {
    return this.dbService.getByIndex('overviewReportOptions', indexName, indexValue);
  }

  getAllByIndexRange(indexName: string, indexValue: number | string): Observable<Array<IdbOverviewReportOptions>> {
    let idbKeyRange: IDBKeyRange = IDBKeyRange.only(indexValue);
    return this.dbService.getAllByIndex('overviewReportOptions', indexName, idbKeyRange);
  }

  count() {
    return this.dbService.count('overviewReportOptions');
  }

  addWithObservable(facility: IdbOverviewReportOptions): Observable<IdbOverviewReportOptions> {
    return this.dbService.add('overviewReportOptions', facility);
  }

  deleteWithObservable(id: number): Observable<any> {
    return this.dbService.delete('overviewReportOptions', id);
  }

  updateWithObservable(values: IdbOverviewReportOptions): Observable<IdbOverviewReportOptions> {
    return this.dbService.update('overviewReportOptions', values);
  }

  async updateReportsRemoveFacility(facilityId: string) {
    let accountReports: Array<IdbOverviewReportOptions> = this.accountOverviewReportOptions.getValue();
    for(let i = 0; i < accountReports.length; i++){
      let report: IdbOverviewReportOptions = accountReports[i];
      report.reportOptions.facilities = report.reportOptions.facilities.filter(facility => {return facility.facilityId != facilityId});
      await this.updateWithObservable(report).toPromise();
    }
  }

  async deleteAccountReports(){
    let accountReports: Array<IdbOverviewReportOptions> = this.accountOverviewReportOptions.getValue();
    await this.deleteReportsAsync(accountReports)
  }

  async deleteReportsAsync(reports: Array<IdbOverviewReportOptions>){
    for(let i = 0; i < reports.length; i++){
      await this.deleteWithObservable(reports[i].id).toPromise();
    }
  }

}

