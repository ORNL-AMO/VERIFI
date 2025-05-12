import { Injectable } from '@angular/core';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { LoadingService } from '../core-components/loading/loading.service';
import { IdbAccount } from '../models/idbModels/account';
import { getNewAccountEmissionsItem, IdbCustomEmissionsItem } from '../models/idbModels/customEmissions';

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
      this.loadingService.setLoadingMessage('Deleting Emissions Items (' + i + '/' + accountEmissionsItems.length + ')...');
      await this.deleteWithObservable(accountEmissionsItems[i].id);
    }
  }

  updateWithObservable(values: IdbCustomEmissionsItem): Observable<IdbCustomEmissionsItem> {
    values.date = new Date();
    return this.dbService.update('customEmissionsItems', values);
  }
}
