import { Injectable } from '@angular/core';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Observable } from 'rxjs';
import { IdbHomeOwner } from '@data/models/idbModels/homeOwner';
import { IndexedDbAccessService } from './indexed-db-access.service';

/** Persistence only; workspace commands own graph validation, atomic writes and publication. */
@Injectable({ providedIn: 'root' })
export class HomeOwnersDbService {
  constructor(private readonly db: NgxIndexedDBService, private readonly access: IndexedDbAccessService) { }

  getAll(): Observable<IdbHomeOwner[]> { return this.db.getAll('homeOwners'); }

  getAllAccountOwners(accountId: string): Promise<IdbHomeOwner[]> {
    return this.access.getAllByIndex<IdbHomeOwner>('homeOwners', 'accountId', accountId);
  }

  getStoredByGuid(guid: string): Promise<IdbHomeOwner | undefined> {
    return this.access.getByGuid<IdbHomeOwner>('homeOwners', guid);
  }

  addWithObservable(record: IdbHomeOwner): Observable<IdbHomeOwner> { return this.db.add('homeOwners', record); }
  updateWithObservable(record: IdbHomeOwner): Observable<IdbHomeOwner> { return this.db.update('homeOwners', record); }
  deleteWithObservable(id: number): Observable<unknown> { return this.db.delete('homeOwners', id); }
}
