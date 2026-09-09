import { Injectable, inject } from '@angular/core';
import { upsertWorkspaceRecords } from '@data/account-workspace/account-workspace-patches';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { MeterCommandHandler } from '@data/account-workspace/handlers/meter-command-handler.service';
import { MeterGroupCommandHandler } from '@data/account-workspace/handlers/meter-group-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbFacility } from '@data/models/idbModels/facility';
import { getNewIdbUtilityMeter, IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { getNewIdbUtilityMeterGroup, IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import {
  MeterDraft,
  MeterGroupDraft,
  MeterGroupDropTarget,
  canAssignMeterToGroup,
  canAssignSourceToGroup
} from '../facility-meters.models';

@Injectable()
export class MetersDashboardActionsService {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly meterHandler = inject(MeterCommandHandler);
  private readonly meterGroupHandler = inject(MeterGroupCommandHandler);

  canAssignMeterToTarget(meter: IdbUtilityMeter, target: MeterGroupDropTarget): boolean {
    return canAssignMeterToGroup(meter, target.group);
  }

  async createMeter(draft: MeterDraft): Promise<IdbUtilityMeter> {
    const account = this.requireAccount();
    const facility = this.requireFacility();
    const name = this.requireName(draft.name, 'Meter name is required.');
    const group = this.resolveGroup(draft.groupId);
    if (!canAssignSourceToGroup(draft.source, group)) {
      throw new WorkspaceWriteError('validation-failed', `${draft.source} meters cannot be assigned to ${group?.groupType} groups.`);
    }

    const meter = {
      ...getNewIdbUtilityMeter(facility.guid, account.guid, true, facility.energyUnit),
      name,
      source: draft.source,
      groupId: group?.guid
    };

    const result = await this.commandBoundary.execute(
      {
        entityKind: 'meter',
        changeKind: 'add',
        entityGuid: meter.guid,
        label: 'Adding meter',
        notification: {
          successTitle: 'Meter added',
          successMessage: name
        },
        publication: {
          mode: 'patch',
          buildPatch: value => upsertWorkspaceRecords('meters', [value])
        }
      },
      () => this.meterHandler.addMeter(meter, account.guid)
    );
    return result.value;
  }

  async createGroup(draft: MeterGroupDraft): Promise<IdbUtilityMeterGroup> {
    const account = this.requireAccount();
    const facility = this.requireFacility();
    const name = this.requireName(draft.name, 'Group name is required.');
    const group = {
      ...getNewIdbUtilityMeterGroup(draft.groupType, name, facility.guid, account.guid),
      description: this.cleanOptionalText(draft.description)
    };

    const result = await this.commandBoundary.execute(
      {
        entityKind: 'meterGroup',
        changeKind: 'add',
        entityGuid: group.guid,
        label: 'Adding meter group',
        notification: {
          successTitle: 'Meter group added',
          successMessage: name
        },
        publication: { mode: 'reload' }
      },
      async () => {
        const added = await this.meterHandler.addMeterGroup(group, account.guid);
        await this.meterGroupHandler.addGroup(added);
        return added;
      }
    );
    return result.value;
  }

  async updateGroup(group: IdbUtilityMeterGroup, draft: MeterGroupDraft): Promise<void> {
    const account = this.requireAccount();
    const current = this.requireWorkspaceGroup(group.guid);
    const assignedMeters = this.workspace.facilityMeters().filter(meter => meter.groupId === current.guid);
    const groupTypeChanged = current.groupType !== draft.groupType;
    if (groupTypeChanged && assignedMeters.length > 0) {
      throw new WorkspaceWriteError('validation-failed', 'Move meters out of this group before changing the group type.');
    }
    const name = this.requireName(draft.name, 'Group name is required.');
    const updated = {
      ...structuredClone(current),
      name,
      groupType: draft.groupType,
      description: this.cleanOptionalText(draft.description)
    };

    await this.commandBoundary.execute(
      {
        entityKind: 'meterGroup',
        changeKind: 'update',
        entityGuid: updated.guid,
        label: 'Saving meter group',
        notification: {
          successTitle: 'Meter group saved',
          successMessage: name
        },
        publication: { mode: 'reload' }
      },
      () => this.meterGroupHandler.saveMeterGroup(
        updated,
        groupTypeChanged,
        current.groupType,
        [],
        [],
        account.guid
      )
    );
  }

  async deleteGroup(group: IdbUtilityMeterGroup): Promise<void> {
    const account = this.requireAccount();
    const current = this.requireWorkspaceGroup(group.guid);
    if (current.id === undefined) {
      throw new WorkspaceWriteError('validation-failed', 'Meter group is missing its IndexedDB id.');
    }
    const metersToClear = this.workspace.facilityMeters()
      .filter(meter => meter.groupId === current.guid)
      .map(meter => ({
        ...structuredClone(meter),
        groupId: undefined
      }));

    await this.commandBoundary.execute(
      {
        entityKind: 'meterGroup',
        changeKind: 'delete',
        entityGuid: current.guid,
        label: 'Deleting meter group',
        notification: {
          successTitle: 'Meter group deleted',
          successMessage: current.name
        },
        publication: { mode: 'reload' }
      },
      async () => {
        await this.meterHandler.deleteMeterGroup(current.id);
        for (const meter of metersToClear) {
          await this.meterHandler.updateMeter(meter, account.guid);
        }
        await this.meterGroupHandler.deleteGroup(structuredClone(current));
      }
    );
  }

  async reassignMeter(meter: IdbUtilityMeter, target: MeterGroupDropTarget): Promise<IdbUtilityMeter | undefined> {
    const account = this.requireAccount();
    const current = this.requireWorkspaceMeter(meter.guid);
    const targetGroupId = target.group?.guid;
    if (current.groupId === targetGroupId) {
      return undefined;
    }
    if (!canAssignMeterToGroup(current, target.group)) {
      throw new WorkspaceWriteError('validation-failed', `${current.source} meters cannot be assigned to ${target.group?.groupType} groups.`);
    }
    const updated = {
      ...structuredClone(current),
      groupId: targetGroupId
    };
    const result = await this.commandBoundary.execute(
      {
        entityKind: 'meter',
        changeKind: 'update',
        entityGuid: updated.guid,
        label: 'Moving meter',
        notification: {
          successTitle: 'Meter moved',
          successMessage: `${updated.name} moved to ${target.label}`
        },
        publication: {
          mode: 'patch',
          buildPatch: value => upsertWorkspaceRecords('meters', [value])
        }
      },
      () => this.meterHandler.updateMeter(updated, account.guid)
    );
    return result.value;
  }

  private requireAccount(): IdbAccount {
    const account = this.workspace.account();
    if (!account || !this.workspace.canWrite() || this.workspace.hasPending()) {
      throw new WorkspaceWriteError('workspace-not-ready', 'The workspace is not ready for meter changes.');
    }
    return account;
  }

  private requireFacility(): IdbFacility {
    const facility = this.workspace.selectedFacility();
    if (!facility) {
      throw new WorkspaceWriteError('workspace-not-ready', 'A facility is required for meter changes.');
    }
    return facility;
  }

  private requireWorkspaceMeter(meterGuid: string): IdbUtilityMeter {
    const meter = this.workspace.facilityMeters().find(item => item.guid === meterGuid);
    if (!meter) {
      throw new WorkspaceWriteError('validation-failed', 'The meter is not part of the selected facility.');
    }
    return meter;
  }

  private requireWorkspaceGroup(groupGuid: string): IdbUtilityMeterGroup {
    const group = this.workspace.facilityMeterGroups().find(item => item.guid === groupGuid);
    if (!group) {
      throw new WorkspaceWriteError('validation-failed', 'The meter group is not part of the selected facility.');
    }
    return group;
  }

  private resolveGroup(groupGuid: string | undefined): IdbUtilityMeterGroup | undefined {
    if (!groupGuid) {
      return undefined;
    }
    return this.requireWorkspaceGroup(groupGuid);
  }

  private requireName(value: string, message: string): string {
    const name = value.trim();
    if (!name) {
      throw new WorkspaceWriteError('validation-failed', message);
    }
    return name;
  }

  private cleanOptionalText(value: string | undefined): string | undefined {
    const text = value?.trim();
    return text || undefined;
  }
}
