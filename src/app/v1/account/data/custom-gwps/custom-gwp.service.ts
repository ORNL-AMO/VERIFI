import { Injectable, inject } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { deleteWorkspaceRecords, upsertWorkspaceRecords } from '@data/account-workspace/account-workspace-patches';
import { CustomDataCommandHandler } from '@data/account-workspace/handlers/custom-data-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import { GlobalWarmingPotentials } from '@data/models/globalWarmingPotentials';
import { IdbAccount } from '@data/models/idbModels/account';
import { getNewAccountCustomGWP, IdbCustomGWP } from '@data/models/idbModels/customGWP';
import { allocateCustomGwpValue } from './custom-gwp.models';

export interface CustomGwpImpact {
  readonly meterCount: number;
  readonly facilityCount: number;
  readonly meterNames: readonly string[];
  readonly facilityNames: readonly string[];
}

@Injectable({ providedIn: 'root' })
export class CustomGwpService {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly commands = inject(WorkspaceCommandBoundary);
  private readonly handler = inject(CustomDataCommandHandler);

  newGwp(): IdbCustomGWP {
    const gwp = getNewAccountCustomGWP(this.requireAccount());
    gwp.value = allocateCustomGwpValue(this.workspace.customGWPs());
    return gwp;
  }

  isNameAvailable(name: string, currentGuid?: string): boolean {
    const normalized = name.trim().toLocaleLowerCase();
    if (!normalized) return false;
    const names = [
      ...GlobalWarmingPotentials.map(option => option.label),
      ...this.workspace.customGWPs().filter(option => option.guid !== currentGuid).map(option => option.label)
    ];
    return !names.some(candidate => candidate?.trim().toLocaleLowerCase() === normalized);
  }

  impactFor(gwp: Pick<IdbCustomGWP, 'value'>): CustomGwpImpact {
    const meters = this.workspace.meters().filter(meter => meter.globalWarmingPotentialOption === gwp.value);
    const facilitiesByGuid = new Map(this.workspace.facilities().map(facility => [facility.guid, facility.name]));
    const facilityNames = new Set<string>();
    meters.forEach(meter => facilityNames.add(facilitiesByGuid.get(meter.facilityId) || 'Unknown facility'));
    return {
      meterCount: meters.length,
      facilityCount: facilityNames.size,
      meterNames: meters.map(meter => meter.name || 'Untitled meter').sort((a, b) => a.localeCompare(b)),
      facilityNames: [...facilityNames].sort((a, b) => a.localeCompare(b))
    };
  }

  async create(gwp: IdbCustomGWP): Promise<IdbCustomGWP> {
    const account = this.requireAccount();
    const result = await this.commands.execute(
      {
        entityKind: 'customGWP',
        changeKind: 'add',
        entityGuid: gwp.guid,
        label: 'Adding custom GWP',
        notification: { successMessage: gwp.label },
        publication: {
          mode: 'patch',
          buildPatch: value => upsertWorkspaceRecords('customGWPs', [value])
        }
      },
      () => this.handler.addCustomGWP(gwp, account.guid)
    );
    return result.value;
  }

  async update(gwp: IdbCustomGWP): Promise<IdbCustomGWP> {
    const account = this.requireAccount();
    const result = await this.commands.execute(
      {
        entityKind: 'customGWP',
        changeKind: 'update',
        entityGuid: gwp.guid,
        label: 'Saving custom GWP',
        notification: { successMessage: gwp.label },
        publication: {
          mode: 'patch',
          buildPatch: value => upsertWorkspaceRecords('customGWPs', [value])
        }
      },
      () => this.handler.updateCustomGWP(gwp, account.guid)
    );
    return result.value;
  }

  async delete(gwp: IdbCustomGWP): Promise<void> {
    const account = this.requireAccount();
    if (this.impactFor(gwp).meterCount > 0) {
      throw new WorkspaceWriteError('validation-failed', 'A custom GWP that is used by a meter cannot be deleted.');
    }
    await this.commands.execute(
      {
        entityKind: 'customGWP',
        changeKind: 'delete',
        entityGuid: gwp.guid,
        label: 'Deleting custom GWP',
        notification: { successMessage: gwp.label },
        publication: {
          mode: 'patch',
          buildPatch: id => deleteWorkspaceRecords('customGWPs', { ids: [id] })
        }
      },
      () => this.handler.deleteCustomGWP(gwp, account.guid)
    );
  }

  private requireAccount(): IdbAccount {
    const account = this.workspace.account();
    if (!account) {
      throw new WorkspaceWriteError('workspace-not-ready', 'An active account is required.');
    }
    return account;
  }
}
