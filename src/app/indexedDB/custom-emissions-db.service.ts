import { Injectable } from '@angular/core';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { IdbAccount, IdbCustomEmissionsItem } from '../models/idb';
import { LoadingService } from '../core-components/loading/loading.service';

@Injectable({
  providedIn: 'root'
})
export class CustomEmissionsDbService {

  accountEmissionsItems: BehaviorSubject<Array<IdbCustomEmissionsItem>>;
  constructor(private dbService: NgxIndexedDBService, private loadingService: LoadingService) {
    this.accountEmissionsItems = new BehaviorSubject<Array<IdbCustomEmissionsItem>>([]);
  }

  getAll(): Observable<Array<IdbCustomEmissionsItem>> {
    return this.dbService.getAll('customEmissionsItems');
  }

  async getAllAccountCustomEmissions(accountId: string): Promise<Array<IdbCustomEmissionsItem>> {
    let allCustomEmissionsItems: Array<IdbCustomEmissionsItem> = await firstValueFrom(this.getAll());
    let customEmissionsItems: Array<IdbCustomEmissionsItem> = allCustomEmissionsItems.filter(item => { return item.accountId == accountId });
    return customEmissionsItems;

  }

  getById(id: number): Observable<IdbCustomEmissionsItem> {
    return this.dbService.getByKey('customEmissionsItems', id);
  }

  getByIndex(indexName: string, indexValue: number): Observable<IdbCustomEmissionsItem> {
    return this.dbService.getByIndex('customEmissionsItems', indexName, indexValue);
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

  async deleteAccountEmissionsItems() {
    let accountEmissionsItems: Array<IdbCustomEmissionsItem> = this.accountEmissionsItems.getValue();
    for (let i = 0; i < accountEmissionsItems.length; i++) {
      this.loadingService.setLoadingMessage('Deleting Emissions Items (' + i + '/' + accountEmissionsItems.length + ')...' );
      await this.deleteWithObservable(accountEmissionsItems[i].id);
    }
  }

  updateWithObservable(values: IdbCustomEmissionsItem): Observable<IdbCustomEmissionsItem> {
    values.date = new Date();
    return this.dbService.update('customEmissionsItems', values);
  }

  getNewAccountEmissionsItem(selectedAccount: IdbAccount): IdbCustomEmissionsItem {
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
        year: 2019,
        co2Emissions: 0.455530652
      },
      {
        year: 2020,
        co2Emissions: 0.43222827
      },
      {
        year: 2023,
        co2Emissions: 0.388753292
      }
    ];
    uSAverageItem.residualEmissionRates = [
      {
        year: 2022,
        co2Emissions: 0.382795242
      },
      {
        year: 2021,
        co2Emissions: 0.411992734
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
        year: 2019,
        co2Emissions: 0.46307276
      },
      {
        year: 2020,
        co2Emissions: 0.439195115
      }
    ]
    return uSAverageItem;
  }

}
