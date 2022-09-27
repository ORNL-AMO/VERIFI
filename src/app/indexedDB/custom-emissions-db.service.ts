import { Injectable } from '@angular/core';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { BehaviorSubject, Observable } from 'rxjs';
import { IdbAccount, IdbCustomEmissionsItem } from '../models/idb';
import { AccountdbService } from './account-db.service';

@Injectable({
  providedIn: 'root'
})
export class CustomEmissionsDbService {

  accountEmissionsItems: BehaviorSubject<Array<IdbCustomEmissionsItem>>;
  constructor(private dbService: NgxIndexedDBService, private accountDbService: AccountdbService) { 
    this.accountEmissionsItems = new BehaviorSubject<Array<IdbCustomEmissionsItem>>([]);
  }




  getAll(): Observable<Array<IdbCustomEmissionsItem>> {
    return this.dbService.getAll('customEmissionsItems');
  }

  getById(id: number): Observable<IdbCustomEmissionsItem> {
    return this.dbService.getByKey('customEmissionsItems', id);
  }

  getByIndex(indexName: string, indexValue: number): Observable<IdbCustomEmissionsItem> {
    return this.dbService.getByIndex('customEmissionsItems', indexName, indexValue);
  }

  getAllByIndexRange(indexName: string, indexValue: number | string): Observable<Array<IdbCustomEmissionsItem>> {
    let idbKeyRange: IDBKeyRange = IDBKeyRange.only(indexValue);
    return this.dbService.getAllByIndex('customEmissionsItems', indexName, idbKeyRange);
  }

  count() {
    return this.dbService.count('accountAnalysisItems');
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

  getNewAccountEmissionsItem(selectedAccount: IdbAccount): IdbCustomEmissionsItem {
    // let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    return {
      accountId: selectedAccount.guid,
      guid: Math.random().toString(36).substr(2, 9),
      date: new Date(),
      subregion: 'New Custom Subregion',
      locationEmissionRates: [],
      residualEmissionRates: []
    }
  }

  getUSAverage(selectedAccount: IdbAccount): IdbCustomEmissionsItem {
    let uSAverageItem: IdbCustomEmissionsItem = this.getNewAccountEmissionsItem(selectedAccount);
    uSAverageItem.subregion = 'U.S. Average';
    uSAverageItem.locationEmissionRates = [
      {
        year: 2022,
        co2Emissions: 0.373127954
      },
      {
        year: 2021,
        co2Emissions: 0.403403406
      },
      {
        year: 2015,
        co2Emissions: 0.517937082
      },
      {
        year: 2014,
        co2Emissions: 0.561726056
      },
      {
        year: 2018,
        co2Emissions: 0.455530652
      },
      {
        year: 2020,
        co2Emissions: 0.43222827
      }
    ];
    return uSAverageItem;
  }

}
