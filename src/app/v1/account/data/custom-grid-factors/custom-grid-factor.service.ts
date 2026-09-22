import { Injectable, inject } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { deleteWorkspaceRecords, upsertWorkspaceRecords } from '@data/account-workspace/account-workspace-patches';
import { CustomDataCommandHandler } from '@data/account-workspace/handlers/custom-data-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import { IdbAccount } from '@data/models/idbModels/account';
import { getNewAccountEmissionsItem, IdbCustomEmissionsItem } from '@data/models/idbModels/customEmissions';
import { EGridService } from '@shared/helper-services/e-grid.service';

export interface CustomGridFactorImpact {
  readonly accountUses: boolean;
  readonly facilityCount: number;
  readonly facilityNames: readonly string[];
  readonly isUsed: boolean;
}

@Injectable({ providedIn: 'root' })
export class CustomGridFactorService {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly commands = inject(WorkspaceCommandBoundary);
  private readonly handler = inject(CustomDataCommandHandler);
  private readonly eGrid = inject(EGridService);

  newGridFactor(): IdbCustomEmissionsItem {
    const item = getNewAccountEmissionsItem(this.requireAccount().guid);
    item.locationEmissionRates.push(this.emptyRate());
    item.residualEmissionRates.push(this.emptyRate());
    return item;
  }

  isNameAvailable(name: string, currentGuid?: string): boolean {
    const normalized = name.trim().toLocaleLowerCase();
    if (!normalized) return false;
    const standardNames = (this.eGrid.excelCo2Emissions ?? []).map(item => item.subregion);
    const customNames = this.workspace.customEmissions()
      .filter(item => item.guid !== currentGuid)
      .map(item => item.subregion);
    return ![...standardNames, ...customNames]
      .some(candidate => candidate?.trim().toLocaleLowerCase() === normalized);
  }

  impactFor(item: Pick<IdbCustomEmissionsItem, 'subregion'>): CustomGridFactorImpact {
    const account = this.workspace.account();
    const facilities = this.workspace.facilities()
      .filter(facility => facility.eGridSubregion === item.subregion);
    const accountUses = account?.eGridSubregion === item.subregion;
    return {
      accountUses,
      facilityCount: facilities.length,
      facilityNames: facilities.map(facility => facility.name || 'Untitled facility').sort((a, b) => a.localeCompare(b)),
      isUsed: accountUses || facilities.length > 0
    };
  }

  async create(item: IdbCustomEmissionsItem): Promise<IdbCustomEmissionsItem> {
    const account = this.requireAccount();
    const result = await this.commands.execute(
      {
        entityKind: 'customEmissions',
        changeKind: 'add',
        entityGuid: item.guid,
        label: 'Adding custom grid factor',
        notification: { successMessage: item.subregion },
        publication: {
          mode: 'patch',
          buildPatch: value => upsertWorkspaceRecords('customEmissions', [value])
        }
      },
      () => this.handler.addCustomEmissions(item, account.guid)
    );
    return result.value;
  }

  async update(item: IdbCustomEmissionsItem, previousSubregion: string): Promise<IdbCustomEmissionsItem> {
    const account = this.requireAccount();
    const renamed = item.subregion !== previousSubregion;
    const updatedAccount = renamed && account.eGridSubregion === previousSubregion
      ? { ...account, eGridSubregion: item.subregion }
      : undefined;
    const updatedFacilities = renamed
      ? this.workspace.facilities()
        .filter(facility => facility.eGridSubregion === previousSubregion)
        .map(facility => ({ ...facility, eGridSubregion: item.subregion }))
      : [];
    const updatesReferences = !!updatedAccount || updatedFacilities.length > 0;
    const result = await this.commands.execute(
      {
        entityKind: 'customEmissions',
        changeKind: 'update',
        entityGuid: item.guid,
        label: 'Saving custom grid factor',
        notification: { successMessage: item.subregion },
        publication: updatesReferences
          ? { mode: 'reload' }
          : {
              mode: 'patch',
              buildPatch: value => upsertWorkspaceRecords('customEmissions', [value])
            }
      },
      () => updatesReferences
        ? this.handler.updateCustomEmissionsWithReferences(item, updatedAccount, updatedFacilities, account.guid)
        : this.handler.updateCustomEmissions(item, account.guid)
    );
    return result.value;
  }

  async delete(item: IdbCustomEmissionsItem): Promise<void> {
    const account = this.requireAccount();
    if (this.impactFor(item).isUsed) {
      throw new WorkspaceWriteError('validation-failed', 'A grid factor that is in use cannot be deleted.');
    }
    await this.commands.execute(
      {
        entityKind: 'customEmissions',
        changeKind: 'delete',
        entityGuid: item.guid,
        label: 'Deleting custom grid factor',
        notification: { successMessage: item.subregion },
        publication: {
          mode: 'patch',
          buildPatch: id => deleteWorkspaceRecords('customEmissions', { ids: [id] })
        }
      },
      () => this.handler.deleteCustomEmissions(item, account.guid)
    );
  }

  private emptyRate(): IdbCustomEmissionsItem['locationEmissionRates'][number] {
    return { year: undefined, CO2: undefined, CH4: undefined, N2O: undefined, co2Emissions: undefined } as unknown as IdbCustomEmissionsItem['locationEmissionRates'][number];
  }

  private requireAccount(): IdbAccount {
    const account = this.workspace.account();
    if (!account) {
      throw new WorkspaceWriteError('workspace-not-ready', 'An active account is required.');
    }
    return account;
  }
}
