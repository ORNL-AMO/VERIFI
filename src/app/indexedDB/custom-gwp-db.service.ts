import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { LoadingService } from '../core-components/loading/loading.service';
import { IdbCustomGWP } from '../models/idbModels/customGWP';
import { IndexedDbAccessService } from './indexed-db-access.service';

@Injectable({
  providedIn: 'root'
})
export class CustomGWPDbService {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  constructor(private dbService: NgxIndexedDBService, private loadingService: LoadingService,
    private indexedDbAccess: IndexedDbAccessService) {
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
    let accountCustomGWP: Array<IdbCustomGWP> = [...this.accountWorkspaceStore.customGWPs()];
    for (let i = 0; i < accountCustomGWP.length; i++) {
      this.loadingService.setLoadingMessage('Deleting Custom GWPs (' + i + '/' + accountCustomGWP.length + ')...');
      await this.deleteWithObservable(accountCustomGWP[i].id);
    }
  }

  updateWithObservable(values: IdbCustomGWP): Observable<IdbCustomGWP> {
    values.date = new Date();
    return this.dbService.update('customGWP', values);
  }

}
