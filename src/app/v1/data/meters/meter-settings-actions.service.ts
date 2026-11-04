import { Injectable, inject } from '@angular/core';
import { EditorConflictError } from '@app/v1/data/editing/draft-reconciliation';
import { applyMeterSettings, MeterSettingsValues, readMeterSettings } from '@app/v1/shared/meter-settings/meter-settings-values';
import { MeterSettingsFormService } from '@app/v1/shared/meter-settings/meter-settings-form.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { MeterCommandHandler } from '@data/account-workspace/handlers/meter-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import { updateMeterDataCharges } from '@data/models/idbModels/utilityMeterData';
import { canAssignSourceToGroup } from './models';
import { reconcileMeterSettings } from './meter-settings-editing';

export interface MeterSettingsIdentity { readonly accountGuid: string; readonly facilityGuid: string; readonly meterGuid: string; }

@Injectable({ providedIn: 'root' })
export class MeterSettingsActionsService {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly boundary = inject(WorkspaceCommandBoundary);
  private readonly handler = inject(MeterCommandHandler);
  private readonly forms = inject(MeterSettingsFormService);

  async updateSettings(identity: MeterSettingsIdentity, values: MeterSettingsValues, baseline: MeterSettingsValues, ownerId: string): Promise<MeterSettingsValues> {
    const result = await this.boundary.execute({ entityKind: 'meter', changeKind: 'update', entityGuid: identity.meterGuid,
      label: 'Saving meter settings', ownerId, notification: { suppressSuccessToast: true }, publication: { mode: 'reload' }
    }, async () => {
      const account = this.workspace.account();
      const facility = this.workspace.facilities().find(item => item.guid === identity.facilityGuid && item.accountId === identity.accountGuid);
      const current = this.workspace.meters().find(item => item.guid === identity.meterGuid && item.accountId === identity.accountGuid && item.facilityId === identity.facilityGuid);
      if (!this.workspace.canWrite() || account?.guid !== identity.accountGuid || !facility || !current || current.id === undefined) {
        throw new WorkspaceWriteError('stale-workspace', 'This meter is no longer available in the active workspace.');
      }
      const saved = readMeterSettings(current);
      const merged = reconcileMeterSettings(baseline, values, saved);
      if (merged.conflicts.length) throw new EditorConflictError(saved);
      const updated = applyMeterSettings(current, merged.value);
      const form = this.forms.buildMeterSettingsForm(updated);
      if (form.invalid || !updated.name?.trim()) throw new WorkspaceWriteError('validation-failed', 'Resolve the meter settings validation issues before saving.');
      const group = updated.groupId ? this.workspace.meterGroups().find(item => item.guid === updated.groupId && item.accountId === account.guid && item.facilityId === facility.guid) : undefined;
      if ((updated.groupId && !group) || !canAssignSourceToGroup(updated.source, group)) throw new WorkspaceWriteError('validation-failed', 'The meter source is incompatible with its group.');
      const readings = this.workspace.meterData().filter(item => item.meterId === current.guid && item.accountId === account.guid && item.facilityId === facility.guid);
      return this.handler.updateMeterWithData(updated, updateMeterDataCharges(updated, structuredClone(readings)), account.guid);
    });
    return readMeterSettings(result.value);
  }
}
