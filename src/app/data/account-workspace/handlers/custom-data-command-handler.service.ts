/**
 * Persistence-only handler for custom emissions, custom fuel, and custom GWP commands.
 */
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CustomEmissionsDbService } from '@data/indexedDB/custom-emissions-db.service';
import { CustomFuelDbService } from '@data/indexedDB/custom-fuel-db.service';
import { CustomGWPDbService } from '@data/indexedDB/custom-gwp-db.service';
import { IndexedDbTransactionService } from '@data/indexedDB/indexed-db-transaction.service';
import { IdbCustomEmissionsItem } from '@data/models/idbModels/customEmissions';
import { IdbCustomFuel } from '@data/models/idbModels/customFuel';
import { IdbCustomGWP } from '@data/models/idbModels/customGWP';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { WorkspaceWriteError } from '../workspace-commands.models';

@Injectable({ providedIn: 'root' })
export class CustomDataCommandHandler {
  constructor(
    private readonly customEmissionsDb: CustomEmissionsDbService,
    private readonly customFuelDb: CustomFuelDbService,
    private readonly customGWPDb: CustomGWPDbService,
    private readonly transactions: IndexedDbTransactionService
  ) { }

  // ---------------------------------------------------------------------------
  // Custom emissions
  // ---------------------------------------------------------------------------

  async addCustomEmissions(item: IdbCustomEmissionsItem, activeAccountGuid: string): Promise<IdbCustomEmissionsItem> {
    this.assertOwnership(item.accountId, activeAccountGuid, 'custom emissions');
    return firstValueFrom(this.customEmissionsDb.addWithObservable({ ...item }));
  }

  async updateCustomEmissions(item: IdbCustomEmissionsItem, activeAccountGuid: string): Promise<IdbCustomEmissionsItem> {
    this.assertOwnership(item.accountId, activeAccountGuid, 'custom emissions');
    return firstValueFrom(this.customEmissionsDb.updateWithObservable({ ...item }));
  }

  async updateCustomEmissionsWithReferences(
    item: IdbCustomEmissionsItem,
    account: IdbAccount | undefined,
    facilities: readonly IdbFacility[],
    activeAccountGuid: string
  ): Promise<IdbCustomEmissionsItem> {
    this.assertRequiredOwnership(item.accountId, activeAccountGuid, 'custom emissions');
    this.assertPersistedId(item.id, 'custom emissions');
    if (account) {
      if (account.guid !== activeAccountGuid) {
        throw new WorkspaceWriteError('cross-account-entity', 'Account reference does not belong to the active account.');
      }
      this.assertPersistedId(account.id, 'account');
    }
    for (const facility of facilities) {
      this.assertRequiredOwnership(facility.accountId, activeAccountGuid, 'facility');
      this.assertPersistedId(facility.id, 'facility');
    }

    const changedAt = new Date();
    const updatedItem = { ...item, date: changedAt };
    const updatedAccount = account ? { ...account, modifiedDate: changedAt } : undefined;
    const updatedFacilities = facilities.map(facility => ({ ...facility, modifiedDate: changedAt }));

    return this.transactions.runTransaction(
      ['customEmissionsItems', 'accounts', 'facilities'],
      'readwrite',
      async transaction => {
        await transaction.put('customEmissionsItems', updatedItem);
        if (updatedAccount) {
          await transaction.put('accounts', updatedAccount);
        }
        for (const facility of updatedFacilities) {
          await transaction.put('facilities', { ...facility });
        }
        return updatedItem;
      }
    );
  }

  async deleteCustomEmissions(item: IdbCustomEmissionsItem, activeAccountGuid: string): Promise<number> {
    this.assertOwnership(item.accountId, activeAccountGuid, 'custom emissions');
    await firstValueFrom(this.customEmissionsDb.deleteWithObservable(item.id));
    return item.id;
  }

  // ---------------------------------------------------------------------------
  // Custom fuel
  // ---------------------------------------------------------------------------

  async addCustomFuel(fuel: IdbCustomFuel, activeAccountGuid: string): Promise<IdbCustomFuel> {
    this.assertOwnership(fuel.accountId, activeAccountGuid, 'custom fuel');
    return firstValueFrom(this.customFuelDb.addWithObservable({ ...fuel }));
  }

  async updateCustomFuel(fuel: IdbCustomFuel, activeAccountGuid: string): Promise<IdbCustomFuel> {
    this.assertOwnership(fuel.accountId, activeAccountGuid, 'custom fuel');
    return firstValueFrom(this.customFuelDb.updateWithObservable({ ...fuel }));
  }

  async updateCustomFuelWithMeters(
    fuel: IdbCustomFuel,
    meters: readonly IdbUtilityMeter[],
    activeAccountGuid: string
  ): Promise<IdbCustomFuel> {
    this.assertOwnership(fuel.accountId, activeAccountGuid, 'custom fuel');
    this.assertPersistedId(fuel.id, 'custom fuel');
    for (const meter of meters) {
      this.assertOwnership(meter.accountId, activeAccountGuid, 'meter');
      this.assertPersistedId(meter.id, 'meter');
    }

    const updatedFuel = { ...fuel, date: new Date() };

    return this.transactions.runTransaction(['customFuels', 'utilityMeter'], 'readwrite', async transaction => {
      await transaction.put('customFuels', updatedFuel);
      for (const meter of meters) {
        await transaction.put('utilityMeter', { ...meter });
      }
      return updatedFuel;
    });
  }

  async deleteCustomFuel(fuel: IdbCustomFuel, activeAccountGuid: string): Promise<number> {
    this.assertOwnership(fuel.accountId, activeAccountGuid, 'custom fuel');
    await firstValueFrom(this.customFuelDb.deleteWithObservable(fuel.id));
    return fuel.id;
  }

  // ---------------------------------------------------------------------------
  // Custom GWP
  // ---------------------------------------------------------------------------

  async addCustomGWP(gwp: IdbCustomGWP, activeAccountGuid: string): Promise<IdbCustomGWP> {
    this.assertOwnership(gwp.accountId, activeAccountGuid, 'custom GWP');
    return firstValueFrom(this.customGWPDb.addWithObservable({ ...gwp }));
  }

  async updateCustomGWP(gwp: IdbCustomGWP, activeAccountGuid: string): Promise<IdbCustomGWP> {
    this.assertOwnership(gwp.accountId, activeAccountGuid, 'custom GWP');
    return firstValueFrom(this.customGWPDb.updateWithObservable({ ...gwp }));
  }

  async deleteCustomGWP(gwp: IdbCustomGWP, activeAccountGuid: string): Promise<number> {
    this.assertOwnership(gwp.accountId, activeAccountGuid, 'custom GWP');
    await firstValueFrom(this.customGWPDb.deleteWithObservable(gwp.id));
    return gwp.id;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private assertOwnership(entityAccountGuid: string | undefined, activeAccountGuid: string, label: string): void {
    if (entityAccountGuid && entityAccountGuid !== activeAccountGuid) {
      throw new WorkspaceWriteError(
        'cross-account-entity',
        `${label} belongs to account ${entityAccountGuid}, not the active account ${activeAccountGuid}.`
      );
    }
  }

  private assertRequiredOwnership(entityAccountGuid: string | undefined, activeAccountGuid: string, label: string): void {
    if (entityAccountGuid !== activeAccountGuid) {
      throw new WorkspaceWriteError(
        'cross-account-entity',
        `${label} does not belong to the active account ${activeAccountGuid}.`
      );
    }
  }

  private assertPersistedId(id: number | undefined, label: string): asserts id is number {
    if (typeof id !== 'number' || !Number.isFinite(id)) {
      throw new WorkspaceWriteError('validation-failed', `${label} is missing its IndexedDB id.`);
    }
  }
}
