import { Injectable, inject } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import { EnergyUseCommandHandler } from '@data/account-workspace/handlers/energy-use-command-handler.service';
import { energyUseMeterLinksError } from '@data/account-workspace/handlers/energy-use-command.models';
import { getNewIdbFacilityEnergyUseGroup, getRandomFlatHexColor } from '@data/models/idbModels/facilityEnergyUseGroups';
import { IdbEntry, getNewIdbEntry } from '@data/models/idbModels/idbEntry';
import { IdbFacilityEnergyUseEquipment } from '@data/models/idbModels/facilityEnergyUseEquipment';
import { EditorConflictError, draftEqual } from '@app/v1/data/editing/draft-reconciliation';
import { EnergyUseCreationDraft, EnergyUseIdentity, EnergyUseSettingsValues, SourceRemovalReview,
  applyEnergyUseSettings, createEnergyUse, energyUseSettings, normalizeEnergyUseSettings, reconcileEnergyUseSettings } from './models/energy-use-settings.models';

@Injectable({ providedIn: 'root' })
export class EnergyUseActionsService {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly boundary = inject(WorkspaceCommandBoundary);
  private readonly handler = inject(EnergyUseCommandHandler);

  async create(draft: EnergyUseCreationDraft, accountGuid: string, facilityGuid: string,
    request = { item: getNewIdbEntry(), groupGuid: getNewIdbEntry().guid, color: getRandomFlatHexColor() }): Promise<IdbFacilityEnergyUseEquipment> {
    const submitted = structuredClone(draft);
    const result = await this.boundary.execute({ entityKind: 'energyUseEquipment', changeKind: 'add', label: 'Adding energy use',
      notification: { successTitle: 'Energy use added' } }, async () => {
      const facility = this.requireFacility(accountGuid, facilityGuid);
      const newGroup = submitted.group.kind === 'new' ? { ...getNewIdbFacilityEnergyUseGroup(accountGuid, facilityGuid), guid: request.groupGuid, name: submitted.group.name.trim() } : undefined;
      const group = newGroup ?? this.workspace.energyUseGroups().find(group => submitted.group.kind === 'existing'
        && group.guid === submitted.group.guid && group.accountId === accountGuid && group.facilityId === facilityGuid);
      if (!group || !group.name.trim()) this.reject('Choose an existing energy-use group or enter a new group name.');
      const item = { ...this.validate(() => createEnergyUse(submitted, group, facility)), ...request.item, color: request.color };
      this.requireLinks(item);
      return this.handler.createItem({ accountGuid, facilityGuid }, item, newGroup);
    });
    return result.value;
  }
  async updateSettings(identity: EnergyUseIdentity, value: EnergyUseSettingsValues, base: EnergyUseSettingsValues,
    ownerId: string, reviews: readonly SourceRemovalReview[] = []): Promise<EnergyUseSettingsValues> {
    const submitted = normalizeEnergyUseSettings(value), baseline = normalizeEnergyUseSettings(base), approved = structuredClone(reviews);
    const result = await this.boundary.execute({ entityKind: 'energyUseEquipment', changeKind: 'update', entityGuid: identity.energyUseGuid,
      label: 'Saving energy use settings', ownerId, notification: { suppressSuccessToast: true } }, async () => {
      const facility = this.requireFacility(identity.accountGuid, identity.facilityGuid);
      const current = this.requireItem(identity), latest = energyUseSettings(current);
      const merged = reconcileEnergyUseSettings(baseline, submitted, latest);
      if (merged.conflicts.length) throw new EditorConflictError(latest);
      const updated = this.validate(() => applyEnergyUseSettings(current, merged.value, facility, approved));
      const configurationChanged = !draftEqual(latest.sources, merged.value.sources) || !draftEqual(latest.utilityMeterGroupIds, merged.value.utilityMeterGroupIds);
      if (configurationChanged) this.requireLinks(updated);
      return energyUseSettings(await this.handler.saveItem(identity, current, updated, configurationChanged));
    });
    return result.value;
  }
  async copy(identity: EnergyUseIdentity, request: IdbEntry = getNewIdbEntry()): Promise<IdbFacilityEnergyUseEquipment> {
    const result = await this.boundary.execute({ entityKind: 'energyUseEquipment', changeKind: 'add', label: 'Copying energy use',
      notification: { successTitle: 'Energy use copied' } }, async () => {
      this.requireFacility(identity.accountGuid, identity.facilityGuid);
      const current = this.requireItem(identity);
      const copy = { ...structuredClone(current), ...request, name: `${current.name || 'Untitled energy use'} (copy)`, selected: false };
      delete copy.id;
      return this.handler.createItem(identity, copy, undefined, false);
    });
    return result.value;
  }
  async delete(identity: EnergyUseIdentity, reviewed: IdbFacilityEnergyUseEquipment): Promise<void> {
    const snapshot = structuredClone(reviewed);
    await this.boundary.execute({ entityKind: 'energyUseEquipment', changeKind: 'delete', entityGuid: identity.energyUseGuid,
      label: 'Deleting energy use', notification: { successTitle: 'Energy use deleted' } }, async () => {
      this.requireFacility(identity.accountGuid, identity.facilityGuid);
      const current = this.requireItem(identity);
      if (!draftEqual(snapshot, current)) this.reject('The saved energy use changed. Review its deletion again.');
      await this.handler.deleteItem(identity, current);
    });
  }
  private requireFacility(accountGuid: string, facilityGuid: string) {
    if (this.workspace.account()?.guid !== accountGuid || !this.workspace.canWrite()) this.reject('This energy use workspace is no longer available.');
    const facility = this.workspace.facilities().find(facility => facility.guid === facilityGuid && facility.accountId === accountGuid);
    if (!facility) this.reject('The owning facility is no longer available.');
    return facility;
  }
  private requireItem(identity: EnergyUseIdentity) {
    const item = this.workspace.energyUseEquipment().find(item => item.guid === identity.energyUseGuid
      && item.accountId === identity.accountGuid && item.facilityId === identity.facilityGuid);
    if (!item) this.reject('This saved energy use is no longer available.');
    return item;
  }
  private requireLinks(item: IdbFacilityEnergyUseEquipment): void {
    const error = energyUseMeterLinksError(item, this.workspace.meterGroups(), this.workspace.meters());
    if (error) this.reject(error);
  }
  private reject(message: string): never { throw new WorkspaceWriteError('validation-failed', message); }
  private validate<T>(operation: () => T): T {
    try { return operation(); }
    catch (error) { throw new WorkspaceWriteError('validation-failed', error instanceof Error ? error.message : 'Resolve the energy use settings before saving.', error); }
  }
}
