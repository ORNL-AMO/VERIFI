import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { IdbAccount, IdbCustomGWP } from '../models/idb';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { LoadingService } from '../core-components/loading/loading.service';

@Injectable({
  providedIn: 'root'
})
export class CustomGWPDbService {

  accountCustomGWPs: BehaviorSubject<Array<IdbCustomGWP>>;
  constructor(private dbService: NgxIndexedDBService, private loadingService: LoadingService) {
    this.accountCustomGWPs = new BehaviorSubject<Array<IdbCustomGWP>>([]);
  }

  getAll(): Observable<Array<IdbCustomGWP>> {
    return this.dbService.getAll('customGWP');
  }

  async getAllAccountCustomGWP(accountId: string): Promise<Array<IdbCustomGWP>> {
    let accountCustomGWP: Array<IdbCustomGWP> = await firstValueFrom(this.getAll());
    let customFuels: Array<IdbCustomGWP> = accountCustomGWP.filter(item => { return item.accountId == accountId });
    return customFuels;

  }

  getById(id: number): Observable<IdbCustomGWP> {
    return this.dbService.getByKey('customGWP', id);
  }

  getByIndex(indexName: string, indexValue: number): Observable<IdbCustomGWP> {
    return this.dbService.getByIndex('customGWP', indexName, indexValue);
  }

  count() {
    return this.dbService.count('customGWP');
  }

  addWithObservable(emissionsItem: IdbCustomGWP): Observable<IdbCustomGWP> {
    return this.dbService.add('customGWP', emissionsItem);
  }

  deleteWithObservable(id: number): Observable<any> {
    return this.dbService.delete('customGWP', id);
  }

  async deleteAccountCustomGWP() {
    let accountCustomGWP: Array<IdbCustomGWP> = this.accountCustomGWPs.getValue();
    for (let i = 0; i < accountCustomGWP.length; i++) {
      this.loadingService.setLoadingMessage('Deleting Custom GWPs (' + i + '/' + accountCustomGWP.length + ')...');
      await this.deleteWithObservable(accountCustomGWP[i].id);
    }
  }

  updateWithObservable(values: IdbCustomGWP): Observable<IdbCustomGWP> {
    values.date = new Date();
    return this.dbService.update('customGWP', values);
  }

  getNewAccountCustomGWP(selectedAccount: IdbAccount): IdbCustomGWP {
    return {
      accountId: selectedAccount.guid,
      guid: Math.random().toString(36).substr(2, 9),
      date: new Date(),
      value: undefined,
      label: undefined,
      display: undefined,
      gwp: undefined
    }
  }
}
