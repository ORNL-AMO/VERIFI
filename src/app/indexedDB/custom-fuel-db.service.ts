import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { LoadingService } from '../core-components/loading/loading.service';
import { IdbCustomFuel } from '../models/idbModels/customFuel';
import { IndexedDbAccessService } from './indexed-db-access.service';

@Injectable({
  providedIn: 'root'
})
export class CustomFuelDbService {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  constructor(private dbService: NgxIndexedDBService, private loadingService: LoadingService,
    private indexedDbAccess: IndexedDbAccessService) {
  }

  getAll(): Observable<Array<IdbCustomFuel>> {
    return this.dbService.getAll('customFuels');
  }

  async getAllAccountCustomFuels(accountId: string): Promise<Array<IdbCustomFuel>> {
    return this.indexedDbAccess.getAllByIndex<IdbCustomFuel>('customFuels', 'accountId', accountId);
  }

  getById(id: number): Observable<IdbCustomFuel> {
    return this.dbService.getByKey('customFuels', id);
  }

  getByIndex(indexName: string, indexValue: IDBValidKey): Observable<IdbCustomFuel> {
    return this.dbService.getByIndex('customFuels', indexName, indexValue);
  }

  getStoredByGuid(guid: string): Promise<IdbCustomFuel | undefined> {
    return this.indexedDbAccess.getByGuid<IdbCustomFuel>('customFuels', guid);
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
    let accountCustomFuels: Array<IdbCustomFuel> = [...this.accountWorkspaceStore.customFuels()];
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
