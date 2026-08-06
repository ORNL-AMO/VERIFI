/**
 * Persistence-only handler for account-level commands.
 *
 * Called by WorkspaceCommandBoundary inside the persist function.
 * Performs only IndexedDB writes; workspace state and events are
 * managed by the boundary.
 */
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AccountdbService } from '../../indexedDB/account-db.service';
import { IdbAccount } from '../../models/idbModels/account';
import { WorkspaceWriteError } from '../workspace-commands.models';

@Injectable({ providedIn: 'root' })
export class AccountCommandHandler {
  constructor(private readonly accountDb: AccountdbService) { }

  async add(account: IdbAccount): Promise<IdbAccount> {
    return firstValueFrom(this.accountDb.addWithObservable({ ...account }));
  }

  async update(account: IdbAccount, activeAccountGuid: string): Promise<IdbAccount> {
    this.assertOwnership(account.guid, activeAccountGuid);
    return firstValueFrom(this.accountDb.updateWithObservable({ ...account }));
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private assertOwnership(entityAccountGuid: string | undefined, activeAccountGuid: string): void {
    if (entityAccountGuid && entityAccountGuid !== activeAccountGuid) {
      throw new WorkspaceWriteError(
        'cross-account-entity',
        `Account ${entityAccountGuid} does not match the active account ${activeAccountGuid}.`
      );
    }
  }
}
