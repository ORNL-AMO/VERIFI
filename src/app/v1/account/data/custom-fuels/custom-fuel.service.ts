import { Injectable, inject } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { deleteWorkspaceRecords, upsertWorkspaceRecords } from '@data/account-workspace/account-workspace-patches';
import { CustomDataCommandHandler } from '@data/account-workspace/handlers/custom-data-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import { getNewAccountCustomFuel, IdbCustomFuel } from '@data/models/idbModels/customFuel';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';

export interface CustomFuelImpact {
  readonly meterCount: number;
  readonly facilityCount: number;
  readonly meterNames: readonly string[];
  readonly facilityNames: readonly string[];
}

@Injectable({ providedIn: 'root' })
export class CustomFuelService {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly commands = inject(WorkspaceCommandBoundary);
  private readonly handler = inject(CustomDataCommandHandler);

  newFuel(): IdbCustomFuel {
    const account = this.requireAccount();
    return getNewAccountCustomFuel(account);
  }

  impactFor(fuel: Pick<IdbCustomFuel, 'value'>): CustomFuelImpact {
    const meters = this.metersUsing(fuel.value);
    const facilityNames = new Set<string>();
    const facilitiesByGuid = new Map(this.workspace.facilities().map(facility => [facility.guid, facility.name]));
    for (const meter of meters) {
      facilityNames.add(facilitiesByGuid.get(meter.facilityId) || 'Unknown facility');
    }
    return {
      meterCount: meters.length,
      facilityCount: facilityNames.size,
      meterNames: meters.map(meter => meter.name || 'Untitled meter').sort((first, second) => first.localeCompare(second)),
      facilityNames: [...facilityNames].sort((first, second) => first.localeCompare(second))
    };
  }

  async create(fuel: IdbCustomFuel): Promise<IdbCustomFuel> {
    const account = this.requireAccount();
    const result = await this.commands.execute(
      {
        entityKind: 'customFuel',
        changeKind: 'add',
        entityGuid: fuel.guid,
        label: 'Adding custom fuel',
        notification: { successMessage: fuel.value },
        publication: {
          mode: 'patch',
          buildPatch: value => upsertWorkspaceRecords('customFuels', [value])
        }
      },
      () => this.handler.addCustomFuel(fuel, account.guid)
    );
    return result.value;
  }

  async update(fuel: IdbCustomFuel, previousName: string): Promise<IdbCustomFuel> {
    const account = this.requireAccount();
    const referencedMeters = previousName === fuel.value ? [] : this.renamedMeters(previousName, fuel.value);
    const result = await this.commands.execute(
      {
        entityKind: 'customFuel',
        changeKind: 'update',
        entityGuid: fuel.guid,
        label: 'Saving custom fuel',
        notification: { successMessage: fuel.value },
        publication: referencedMeters.length > 0
          ? { mode: 'reload' }
          : {
              mode: 'patch',
              buildPatch: value => upsertWorkspaceRecords('customFuels', [value])
            }
      },
      () => referencedMeters.length > 0
        ? this.handler.updateCustomFuelWithMeters(fuel, referencedMeters, account.guid)
        : this.handler.updateCustomFuel(fuel, account.guid)
    );
    return result.value;
  }

  async delete(fuel: IdbCustomFuel): Promise<void> {
    const account = this.requireAccount();
    if (this.impactFor(fuel).meterCount > 0) {
      throw new WorkspaceWriteError('validation-failed', 'A custom fuel that is used by a meter cannot be deleted.');
    }
    await this.commands.execute(
      {
        entityKind: 'customFuel',
        changeKind: 'delete',
        entityGuid: fuel.guid,
        label: 'Deleting custom fuel',
        notification: { successMessage: fuel.value },
        publication: {
          mode: 'patch',
          buildPatch: id => deleteWorkspaceRecords('customFuels', { ids: [id] })
        }
      },
      () => this.handler.deleteCustomFuel(fuel, account.guid)
    );
  }

  private metersUsing(name: string | undefined): readonly IdbUtilityMeter[] {
    if (!name) return [];
    return this.workspace.meters().filter(meter => meter.fuel === name || meter.vehicleFuel === name);
  }

  private renamedMeters(previousName: string, nextName: string): readonly IdbUtilityMeter[] {
    return this.metersUsing(previousName).map(meter => ({
      ...meter,
      fuel: meter.fuel === previousName ? nextName : meter.fuel,
      vehicleFuel: meter.vehicleFuel === previousName ? nextName : meter.vehicleFuel
    }));
  }

  private requireAccount() {
    const account = this.workspace.account();
    if (!account) {
      throw new WorkspaceWriteError('workspace-not-ready', 'An active account is required.');
    }
    return account;
  }
}
