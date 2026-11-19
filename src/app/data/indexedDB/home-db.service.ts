import { Injectable } from '@angular/core';
import { IdbHomeDashboard, IdbHomeOwner } from '@data/models/idbModels/homeDashboard';
import { IndexedDbAccessService } from './indexed-db-access.service';

/** Read repository only. Native command transactions own all graph writes. */
@Injectable({ providedIn: 'root' })
export class HomeDbService {
  constructor(private readonly access: IndexedDbAccessService) { }
  getAllAccountDashboards(accountGuid: string): Promise<IdbHomeDashboard[]> {
    return this.access.getAllByIndex('homeDashboards', 'accountId', accountGuid);
  }
  getAllAccountOwners(accountGuid: string): Promise<IdbHomeOwner[]> {
    return this.access.getAllByIndex('homeOwners', 'accountId', accountGuid);
  }
}
