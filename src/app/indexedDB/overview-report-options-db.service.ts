import { Injectable } from '@angular/core';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { LocalStorageService } from 'ngx-webstorage';
import { BehaviorSubject, Observable } from 'rxjs';
import { IdbAccount, IdbOverviewReportOptions } from '../models/idb';
import { AccountdbService } from './account-db.service';

@Injectable({
  providedIn: 'root'
})
export class OverviewReportOptionsDbService {

  accountOverviewReportOptions: BehaviorSubject<Array<IdbOverviewReportOptions>>;
  selectedOverviewReportOptions: BehaviorSubject<IdbOverviewReportOptions>;
  constructor(private dbService: NgxIndexedDBService, private localStorageService: LocalStorageService,
    private accountDbService: AccountdbService) {
    this.accountOverviewReportOptions = new BehaviorSubject<Array<IdbOverviewReportOptions>>(new Array());
    this.selectedOverviewReportOptions = new BehaviorSubject<IdbOverviewReportOptions>(undefined);
  }

  async initializeFacilityFromLocalStorage() {
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    if (selectedAccount) {
      let allOverviewReportOptions: Array<IdbOverviewReportOptions> = await this.getAll().toPromise();
      let accountOverviewReportOptions: Array<IdbOverviewReportOptions> = allOverviewReportOptions.filter(reportOption => { return reportOption.accountId == selectedAccount.id });
      let storedOptionsId: number = this.localStorageService.retrieve("overviewReportOptionsId");
      if (storedOptionsId) {
        let selectedOverviewReportOptions: IdbOverviewReportOptions = accountOverviewReportOptions.find(facility => { return facility.id == storedOptionsId });
        this.selectedOverviewReportOptions.next(selectedOverviewReportOptions);
      } else if (accountOverviewReportOptions.length != 0) {
        this.selectedOverviewReportOptions.next(accountOverviewReportOptions[0]);
      }
      this.accountOverviewReportOptions.next(accountOverviewReportOptions);
    }
    //subscribe after initialization
    this.selectedOverviewReportOptions.subscribe(overviewReportOptions => {
      if (overviewReportOptions) {
        this.localStorageService.store('overviewReportOptionsId', overviewReportOptions.id);
      }
    });
  }

  setAccountOverviewReportOptions() {
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    if (selectedAccount) {
      this.getAllByIndexRange('accountId', selectedAccount.id).subscribe(facilities => {
        this.accountOverviewReportOptions.next(facilities);
      });
    }
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

  add(overviewReportOptions: IdbOverviewReportOptions): void {
    this.dbService.add('overviewReportOptions', overviewReportOptions).subscribe(() => {
      this.setAccountOverviewReportOptions();
    });
  }

  addWithObservable(facility: IdbOverviewReportOptions): Observable<IdbOverviewReportOptions> {
    return this.dbService.add('overviewReportOptions', facility);
  }

  deleteWithObservable(id: number): Observable<any> {
    return this.dbService.delete('overviewReportOptions', id);
  }

  update(values: IdbOverviewReportOptions): void {
    this.dbService.update('overviewReportOptions', values).subscribe(() => {
      this.setAccountOverviewReportOptions();
    });
  }

  deleteById(facilityId: number): void {
    this.dbService.delete('overviewReportOptions', facilityId).subscribe(() => {
      this.setAccountOverviewReportOptions();
    });
  }


}
