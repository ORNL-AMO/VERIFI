import { Injectable } from '@angular/core';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Observable } from 'rxjs';
import { IdbHomeDashboard } from '@data/models/idbModels/homeDashboard';
import { IndexedDbAccessService } from './indexed-db-access.service';

/** Persistence only; workspace commands own graph validation, atomic writes and publication. */
@Injectable({ providedIn: 'root' })
export class HomeDashboardsDbService {
  constructor(private readonly db: NgxIndexedDBService, private readonly access: IndexedDbAccessService) { }

  getAll(): Observable<IdbHomeDashboard[]> { return this.db.getAll('homeDashboards'); }

  getAllAccountDashboards(accountId: string): Promise<IdbHomeDashboard[]> {
    return this.access.getAllByIndex<IdbHomeDashboard>('homeDashboards', 'accountId', accountId);
  }

  getStoredByGuid(guid: string): Promise<IdbHomeDashboard | undefined> {
    return this.access.getByGuid<IdbHomeDashboard>('homeDashboards', guid);
  }

  addWithObservable(record: IdbHomeDashboard): Observable<IdbHomeDashboard> { return this.db.add('homeDashboards', record); }
  updateWithObservable(record: IdbHomeDashboard): Observable<IdbHomeDashboard> { return this.db.update('homeDashboards', record); }
  deleteWithObservable(id: number): Observable<unknown> { return this.db.delete('homeDashboards', id); }
}
