/**
 * Persistence-only handler for custom emissions, custom fuel, and custom GWP commands.
 */
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CustomEmissionsDbService } from '../../indexedDB/custom-emissions-db.service';
import { CustomFuelDbService } from '../../indexedDB/custom-fuel-db.service';
import { CustomGWPDbService } from '../../indexedDB/custom-gwp-db.service';
import { IdbCustomEmissionsItem } from '../../models/idbModels/customEmissions';
import { IdbCustomFuel } from '../../models/idbModels/customFuel';
import { IdbCustomGWP } from '../../models/idbModels/customGWP';
import { WorkspaceWriteError } from '../workspace-commands.models';

@Injectable({ providedIn: 'root' })
export class CustomDataCommandHandler {
  constructor(
    private readonly customEmissionsDb: CustomEmissionsDbService,
    private readonly customFuelDb: CustomFuelDbService,
    private readonly customGWPDb: CustomGWPDbService
  ) { }

  // ---------------------------------------------------------------------------
  // Custom emissions
  // ---------------------------------------------------------------------------

  async addCustomEmissions(item: IdbCustomEmissionsItem): Promise<IdbCustomEmissionsItem> {
    return firstValueFrom(this.customEmissionsDb.addWithObservable({ ...item }));
  }

  async updateCustomEmissions(item: IdbCustomEmissionsItem, activeAccountGuid: string): Promise<IdbCustomEmissionsItem> {
    this.assertOwnership(item.accountId, activeAccountGuid, 'custom emissions');
    return firstValueFrom(this.customEmissionsDb.updateWithObservable({ ...item }));
  }

  async deleteCustomEmissions(item: IdbCustomEmissionsItem, activeAccountGuid: string): Promise<number> {
    this.assertOwnership(item.accountId, activeAccountGuid, 'custom emissions');
    await firstValueFrom(this.customEmissionsDb.deleteWithObservable(item.id));
    return item.id;
  }

  // ---------------------------------------------------------------------------
  // Custom fuel
  // ---------------------------------------------------------------------------

  async addCustomFuel(fuel: IdbCustomFuel): Promise<IdbCustomFuel> {
    return firstValueFrom(this.customFuelDb.addWithObservable({ ...fuel }));
  }

  async updateCustomFuel(fuel: IdbCustomFuel, activeAccountGuid: string): Promise<IdbCustomFuel> {
    this.assertOwnership(fuel.accountId, activeAccountGuid, 'custom fuel');
    return firstValueFrom(this.customFuelDb.updateWithObservable({ ...fuel }));
  }

  async deleteCustomFuel(fuel: IdbCustomFuel, activeAccountGuid: string): Promise<number> {
    this.assertOwnership(fuel.accountId, activeAccountGuid, 'custom fuel');
    await firstValueFrom(this.customFuelDb.deleteWithObservable(fuel.id));
    return fuel.id;
  }

  // ---------------------------------------------------------------------------
  // Custom GWP
  // ---------------------------------------------------------------------------

  async addCustomGWP(gwp: IdbCustomGWP): Promise<IdbCustomGWP> {
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
}
