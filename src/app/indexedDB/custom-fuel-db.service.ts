import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { LoadingService } from '../core-components/loading/loading.service';
import { IdbAccount } from '../models/idbModels/account';
import { IdbCustomFuel } from '../models/idbModels/customFuel';

@Injectable({
  providedIn: 'root'
})
export class CustomFuelDbService {

  accountCustomFuels: BehaviorSubject<Array<IdbCustomFuel>>;
  constructor(private dbService: NgxIndexedDBService, private loadingService: LoadingService) {
    this.accountCustomFuels = new BehaviorSubject<Array<IdbCustomFuel>>([]);
  }

  getAll(): Observable<Array<IdbCustomFuel>> {
    return this.dbService.getAll('customFuels');
  }

  async getAllAccountCustomFuels(accountId: string): Promise<Array<IdbCustomFuel>> {
    let accountCustomFuels: Array<IdbCustomFuel> = await firstValueFrom(this.getAll());
    let customFuels: Array<IdbCustomFuel> = accountCustomFuels.filter(item => { return item.accountId == accountId });
    return customFuels;

  }

  getById(id: number): Observable<IdbCustomFuel> {
    return this.dbService.getByKey('customFuels', id);
  }

  getByIndex(indexName: string, indexValue: number): Observable<IdbCustomFuel> {
    return this.dbService.getByIndex('customFuels', indexName, indexValue);
  }

  count() {
    return this.dbService.count('customFuels');
  }

  addWithObservable(emissionsItem: IdbCustomFuel): Observable<IdbCustomFuel> {
    return this.dbService.add('customFuels', emissionsItem);
  }

  deleteWithObservable(id: number): Observable<any> {
    return this.dbService.delete('customFuels', id);
  }

  async deleteAccountCustomFuels() {
    let accountCustomFuels: Array<IdbCustomFuel> = this.accountCustomFuels.getValue();
    for (let i = 0; i < accountCustomFuels.length; i++) {
      this.loadingService.setLoadingMessage('Deleting Custom Fuels (' + i + '/' + accountCustomFuels.length + ')...');
      await this.deleteWithObservable(accountCustomFuels[i].id);
    }
  }

  updateWithObservable(values: IdbCustomFuel): Observable<IdbCustomFuel> {
    values.date = new Date();
    return this.dbService.update('customFuels', values);
  }


}
