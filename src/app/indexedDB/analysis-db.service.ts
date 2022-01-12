import { Injectable } from '@angular/core';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { LocalStorageService } from 'ngx-webstorage';
import { BehaviorSubject, Observable } from 'rxjs';
import { IdbAccount, IdbAnalysisItem, IdbFacility } from '../models/idb';
import { AccountdbService } from './account-db.service';
import { FacilitydbService } from './facility-db.service';

@Injectable({
  providedIn: 'root'
})
export class AnalysisDbService {

  accountAnalysisItems: BehaviorSubject<Array<IdbAnalysisItem>>;
  facilityAnalysisItems: BehaviorSubject<Array<IdbAnalysisItem>>;
  selectedAnalysisItem: BehaviorSubject<IdbAnalysisItem>;

  constructor(private dbService: NgxIndexedDBService, private localStorageService: LocalStorageService,
    private facilityDbService: FacilitydbService, private accountDbService: AccountdbService) {
    this.accountAnalysisItems = new BehaviorSubject<Array<IdbAnalysisItem>>([]);
    this.facilityAnalysisItems = new BehaviorSubject<Array<IdbAnalysisItem>>([]);
    this.selectedAnalysisItem = new BehaviorSubject<IdbAnalysisItem>(undefined);
  }


  async initializeAnalysisItems() {
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    if (selectedAccount) {
      let accounAnalysisItems: Array<IdbAnalysisItem> = await this.getAllByIndexRange('accountId', selectedAccount.id).toPromise();
      this.accountAnalysisItems.next(accounAnalysisItems);
      let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
      if (selectedFacility) {
        let facilityAnalysisItems: Array<IdbAnalysisItem> = accounAnalysisItems.filter(meter => { return meter.facilityId == selectedFacility.id });
        this.facilityAnalysisItems.next(facilityAnalysisItems);
        let storedAnalysisId: number = this.localStorageService.retrieve("analysisItemId");
        if (storedAnalysisId) {
          let selectedAnalysisItem: IdbAnalysisItem = facilityAnalysisItems.find(item => { return item.id == storedAnalysisId });
          this.selectedAnalysisItem.next(selectedAnalysisItem);
        }
      }
    }
    //subscribe after initialization
    this.selectedAnalysisItem.subscribe(analysisItem => {
      if (analysisItem) {
        this.localStorageService.store('analysisItemId', analysisItem.id);
      }
    });
  }

  setAccountAnalysisItems() {
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    if (selectedAccount) {
      this.getAllByIndexRange('accountId', selectedAccount.id).subscribe((analysisItems: Array<IdbAnalysisItem>) => {
        this.accountAnalysisItems.next(analysisItems);
        let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
        let facilityAnalysisItems: Array<IdbAnalysisItem> = analysisItems.filter(item => {return item.facilityId == selectedFacility.id});
        this.facilityAnalysisItems.next(facilityAnalysisItems);
      });
    }
  }

  getAll(): Observable<Array<IdbAnalysisItem>> {
    return this.dbService.getAll('analysisItems');
  }

  getById(id: number): Observable<IdbAnalysisItem> {
    return this.dbService.getByKey('analysisItems', id);
  }

  getByIndex(indexName: string, indexValue: number): Observable<IdbAnalysisItem> {
    return this.dbService.getByIndex('analysisItems', indexName, indexValue);
  }

  getAllByIndexRange(indexName: string, indexValue: number | string): Observable<Array<IdbAnalysisItem>> {
    let idbKeyRange: IDBKeyRange = IDBKeyRange.only(indexValue);
    return this.dbService.getAllByIndex('analysisItems', indexName, idbKeyRange);
  }

  count() {
    return this.dbService.count('analysisItems');
  }

  add(analysisItems: IdbAnalysisItem): void {
    this.dbService.add('analysisItems', analysisItems).subscribe(() => {
      this.setAccountAnalysisItems();
    });
  }

  addWithObservable(facility: IdbAnalysisItem): Observable<IdbAnalysisItem> {
    return this.dbService.add('analysisItems', facility);
  }

  deleteWithObservable(id: number): Observable<any> {
    return this.dbService.delete('analysisItems', id);
  }

  update(values: IdbAnalysisItem): void {
    this.dbService.update('analysisItems', values).subscribe(() => {
      this.setAccountAnalysisItems();
    });
  }

  updateWithObservable(values: IdbAnalysisItem): Observable<Array<IdbAnalysisItem>> {
    return this.dbService.update('analysisItems', values);
  }

  deleteById(analysisItemId: number): void {
    this.dbService.delete('analysisItems', analysisItemId).subscribe(() => {
      this.setAccountAnalysisItems();
    });
  }

  getNewAnalysisItem(): IdbAnalysisItem {
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    return {
      facilityId: selectedFacility.id,
      accountId: selectedAccount.id,
      date: new Date(),
      name: 'Analysis Item'
    }
  }
}
