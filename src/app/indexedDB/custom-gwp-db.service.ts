import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { LoadingService } from '../core-components/loading/loading.service';
import { GlobalWarmingPotentials } from '../models/globalWarmingPotentials';
import { IdbCustomGWP } from '../models/idbModels/customGWP';
import { IndexedDbAccessService } from './indexed-db-access.service';

@Injectable({
  providedIn: 'root'
})
export class CustomGWPDbService {

  accountCustomGWPs: BehaviorSubject<Array<IdbCustomGWP>>;
  constructor(private dbService: NgxIndexedDBService, private loadingService: LoadingService,
    private indexedDbAccess: IndexedDbAccessService) {
    this.accountCustomGWPs = new BehaviorSubject<Array<IdbCustomGWP>>([]);
  }

  getAll(): Observable<Array<IdbCustomGWP>> {
    return this.dbService.getAll('customGWP');
  }

  async getAllAccountCustomGWP(accountId: string): Promise<Array<IdbCustomGWP>> {
    return this.indexedDbAccess.getAllByIndex<IdbCustomGWP>('customGWP', 'accountId', accountId);
  }

  getById(id: number): Observable<IdbCustomGWP> {
    return this.dbService.getByKey('customGWP', id);
  }

  getByIndex(indexName: string, indexValue: IDBValidKey): Observable<IdbCustomGWP> {
    return this.dbService.getByIndex('customGWP', indexName, indexValue);
  }

  getStoredByGuid(guid: string): Promise<IdbCustomGWP | undefined> {
    return this.indexedDbAccess.getByGuid<IdbCustomGWP>('customGWP', guid);
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

  getUniqValue(){
    let accountCustomGWPs: Array<IdbCustomGWP> = this.accountCustomGWPs.getValue();
    let existingValues: Array<number> = accountCustomGWPs.map(cGWP => {
      return cGWP.value;
    });
    GlobalWarmingPotentials.forEach(gwpOption => {
      existingValues.push(gwpOption.value);
    })
    let uniqVal: number = Math.floor(Math.random() * 50000)
    while(existingValues.includes(uniqVal)){
      uniqVal = Math.floor(Math.random() * 50000);
      console.log(uniqVal);
    }
    return uniqVal;
  }

}
