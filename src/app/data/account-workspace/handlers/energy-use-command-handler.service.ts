/**
 * Persistence-only handler for energy-use group and equipment commands.
 */
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { FacilityEnergyUseEquipmentDbService } from '@data/indexedDB/facility-energy-use-equipment-db.service';
import { FacilityEnergyUseGroupsDbService } from '@data/indexedDB/facility-energy-use-groups-db.service';
import { IdbFacilityEnergyUseEquipment } from '@data/models/idbModels/facilityEnergyUseEquipment';
import { IdbFacilityEnergyUseGroup } from '@data/models/idbModels/facilityEnergyUseGroups';
import { WorkspaceWriteError } from '../workspace-commands.models';
import { IndexedDbTransactionContext, IndexedDbTransactionService } from '@data/indexedDB/indexed-db-transaction.service';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { EnergyUseBatchChange, EnergyUseCommandIdentity, EnergyUseGroupIdentity, EnergyUseGroupDeletion, EnergyUseGroupSettings, EnergyUseOwner, energyUseMeterLinksError } from './energy-use-command.models';

@Injectable({ providedIn: 'root' })
export class EnergyUseCommandHandler {
  constructor(
    private readonly groupDb: FacilityEnergyUseGroupsDbService,
    private readonly equipmentDb: FacilityEnergyUseEquipmentDbService,
    private readonly transactions: IndexedDbTransactionService
  ) { }

  /** Production v1 commands re-read durable owners and records in the same transaction. */
  async createItem(owner: EnergyUseOwner, item: IdbFacilityEnergyUseEquipment,
    newGroup?: IdbFacilityEnergyUseGroup, validateLinks = true): Promise<IdbFacilityEnergyUseEquipment> {
    return this.insertItem(owner, item, newGroup, validateLinks);
  }

  async copyItem(identity: EnergyUseCommandIdentity, reviewed: IdbFacilityEnergyUseEquipment,
    copy: IdbFacilityEnergyUseEquipment): Promise<IdbFacilityEnergyUseEquipment> {
    return this.insertItem(identity, structuredClone(copy), undefined, false, { identity: { ...identity }, item: structuredClone(reviewed) });
  }

  private async insertItem(owner: EnergyUseOwner, item: IdbFacilityEnergyUseEquipment,
    newGroup: IdbFacilityEnergyUseGroup | undefined, validateLinks: boolean,
    source?: { readonly identity: EnergyUseCommandIdentity; readonly item: IdbFacilityEnergyUseEquipment }): Promise<IdbFacilityEnergyUseEquipment> {
    return this.transactions.runTransaction(['facilities', 'facilityEnergyUseGroups', 'facilityEnergyUseEquipment', 'utilityMeterGroups', 'utilityMeter'], 'readwrite', async tx => {
      await this.requireFacility(tx, owner);
      this.requireItemOwner(item, owner);
      if (source) await this.requireCurrentItem(tx, source.identity, source.item);
      if (newGroup && (newGroup.id !== undefined || !newGroup.name.trim() || newGroup.guid !== item.energyUseGroupId
        || newGroup.accountId !== owner.accountGuid || newGroup.facilityId !== owner.facilityGuid)) this.reject('The new energy-use group is invalid.');
      const existing = await tx.getAllByIndex<IdbFacilityEnergyUseEquipment>('facilityEnergyUseEquipment', 'guid', item.guid);
      if (item.id !== undefined) this.reject('New energy uses cannot reuse an IndexedDB key.');
      // A retry after committed persistence but failed publication must never create a duplicate.
      if (existing.length) {
        if (existing.length === 1 && JSON.stringify({ ...existing[0], id: undefined }) === JSON.stringify(item)) {
          const group = await this.requireGroup(tx, owner, item.energyUseGroupId);
          if (newGroup && group.name !== newGroup.name) this.reject('This energy-use group was already created with different details. Open the saved energy use before changing its group.');
          return existing[0];
        }
        this.reject('This energy use was already created. Open its saved settings from the inventory before making further changes.');
      }
      let group: IdbFacilityEnergyUseGroup;
      if (newGroup) {
        if ((await tx.getAllByIndex('facilityEnergyUseGroups', 'guid', newGroup.guid)).length) this.reject('The new energy-use group is invalid.');
        group = newGroup;
      } else {
        group = await this.requireGroup(tx, owner, item.energyUseGroupId);
      }
      if (group.accountId !== owner.accountGuid || group.facilityId !== owner.facilityGuid) this.reject('The energy-use group belongs to another facility.');
      if (validateLinks) await this.requireLinks(tx, item);
      if (newGroup) await tx.add('facilityEnergyUseGroups', structuredClone(newGroup));
      const id = await tx.add('facilityEnergyUseEquipment', structuredClone(item));
      return { ...item, id: Number(id) };
    });
  }

  async saveItem(identity: EnergyUseCommandIdentity, before: IdbFacilityEnergyUseEquipment,
    updated: IdbFacilityEnergyUseEquipment, validateLinks: boolean): Promise<IdbFacilityEnergyUseEquipment> {
    return this.transactions.runTransaction(['facilities', 'facilityEnergyUseEquipment', 'utilityMeterGroups', 'utilityMeter'], 'readwrite', async tx => {
      await this.requireFacility(tx, identity);
      await this.requireCurrentItem(tx, identity, before);
      this.requireItemOwner(updated, identity);
      if (updated.id !== before.id || updated.guid !== before.guid || updated.energyUseGroupId !== before.energyUseGroupId) this.reject('Settings cannot change item identity or its energy-use group.');
      if (validateLinks) await this.requireLinks(tx, updated);
      const saved = { ...structuredClone(updated), modifiedDate: new Date() };
      await tx.put('facilityEnergyUseEquipment', saved);
      return saved;
    });
  }

  /** V1 group metadata edits preserve all relationships and non-editor fields. */
  async saveGroupSettings(identity: EnergyUseGroupIdentity, before: IdbFacilityEnergyUseGroup,
    values: EnergyUseGroupSettings): Promise<IdbFacilityEnergyUseGroup> {
    if (typeof values.name !== 'string' || !values.name.trim() || typeof values.notes !== 'string') this.reject('Enter an energy-use group name.');
    return this.transactions.runTransaction(['facilities', 'facilityEnergyUseGroups'], 'readwrite', async tx => {
      await this.requireFacility(tx, identity);
      const current = await this.requireGroup(tx, identity, identity.energyUseGroupGuid);
      if (before.id === undefined || before.guid !== identity.energyUseGroupGuid || JSON.stringify(current) !== JSON.stringify(before)) {
        this.reject('The saved energy-use group changed. Reload or review it again before continuing.');
      }
      const saved = { ...current, name: values.name.trim(), notes: values.notes.trim(), modifiedDate: new Date() };
      await tx.put('facilityEnergyUseGroups', saved);
      return saved;
    });
  }

  /** Move within one facility without rewriting settings, history, or utility links. */
  async transferItem(identity: EnergyUseCommandIdentity, reviewed: IdbFacilityEnergyUseEquipment,
    target: IdbFacilityEnergyUseGroup): Promise<IdbFacilityEnergyUseEquipment> {
    const before = structuredClone(reviewed), destination = structuredClone(target);
    return this.transactions.runTransaction(['facilities', 'facilityEnergyUseGroups', 'facilityEnergyUseEquipment'], 'readwrite', async tx => {
      await this.requireFacility(tx, identity);
      await this.requireCurrentItem(tx, identity, before);
      const group = await this.requireGroup(tx, identity, destination.guid);
      if (group.guid === before.energyUseGroupId || group.guid === 'unavailable' || JSON.stringify(group) !== JSON.stringify(destination)) {
        this.reject('The destination group changed or is invalid. Choose another group and review the transfer again.');
      }
      const saved = { ...before, energyUseGroupId: group.guid, modifiedDate: new Date() };
      await tx.put('facilityEnergyUseEquipment', saved);
      return saved;
    });
  }

  async deleteItem(identity: EnergyUseCommandIdentity, reviewed: IdbFacilityEnergyUseEquipment): Promise<void> {
    await this.transactions.runTransaction(['facilities', 'facilityEnergyUseEquipment'], 'readwrite', async tx => {
      await this.requireFacility(tx, identity);
      await this.requireCurrentItem(tx, identity, reviewed);
      await tx.deleteByKey('facilityEnergyUseEquipment', reviewed.id!);
    });
  }

  /** Delete a reviewed group and its complete membership as one durable operation. */
  async deleteGroupWithItems(identity: EnergyUseGroupIdentity, reviewedGroup: IdbFacilityEnergyUseGroup,
    reviewedItems: readonly IdbFacilityEnergyUseEquipment[]): Promise<void> {
    if (reviewedGroup.guid !== identity.energyUseGroupGuid || reviewedGroup.facilityId !== identity.facilityGuid) this.reject('The reviewed group is invalid.');
    await this.deleteGroupsWithItems(identity.accountGuid, [{ group: reviewedGroup, items: reviewedItems }]);
  }

  /** All selected groups and complete memberships commit or roll back together. */
  async deleteGroupsWithItems(accountGuid: string, changes: readonly EnergyUseGroupDeletion[]): Promise<void> {
    const reviewed = structuredClone(changes);
    if (!reviewed.length || new Set(reviewed.map(row => row.group.guid)).size !== reviewed.length) this.reject('Choose a nonempty set of unique energy-use groups.');
    await this.transactions.runTransaction(['facilities', 'facilityEnergyUseGroups', 'facilityEnergyUseEquipment'], 'readwrite', async tx => {
      const equipment = await tx.getAll<IdbFacilityEnergyUseEquipment>('facilityEnergyUseEquipment');
      const ordered = (items: readonly IdbFacilityEnergyUseEquipment[]) => [...items].sort((a, b) => a.guid.localeCompare(b.guid));
      for (const row of reviewed) {
        const identity = { accountGuid, facilityGuid: row.group.facilityId };
        await this.requireFacility(tx, identity);
        const group = await this.requireGroup(tx, identity, row.group.guid);
        if (group.id === undefined || JSON.stringify(group) !== JSON.stringify(row.group)) this.reject('The saved group changed. Review its deletion again.');
        const members = equipment.filter(item => item.energyUseGroupId === group.guid);
        if (JSON.stringify(ordered(members)) !== JSON.stringify(ordered(row.items))) this.reject('The group items changed. Review the group deletion again.');
        for (const item of members) {
          this.requireItemOwner(item, identity);
          if (item.id === undefined) this.reject('The saved group items are invalid.');
        }
      }
      for (const row of reviewed) {
        for (const item of row.items) await tx.deleteByKey('facilityEnergyUseEquipment', item.id!);
        await tx.deleteByKey('facilityEnergyUseGroups', row.group.id!);
      }
    });
  }

  async applyBatch(accountGuid: string, changes: readonly EnergyUseBatchChange[]): Promise<void> {
    const reviewed = structuredClone(changes);
    if (!reviewed.length || new Set(reviewed.map(row => row.before.guid)).size !== reviewed.length) this.reject('Choose a nonempty set of unique energy uses.');
    await this.transactions.runTransaction(['facilities', 'facilityEnergyUseEquipment'], 'readwrite', async tx => {
      for (const row of reviewed) {
        const identity = { accountGuid, facilityGuid: row.facility.guid, energyUseGuid: row.before.guid };
        await this.requireFacility(tx, identity);
        const facilities = await tx.getAllByIndex<IdbFacility>('facilities', 'guid', row.facility.guid);
        if (JSON.stringify(facilities[0]) !== JSON.stringify(row.facility)) this.reject('Facility settings changed. Review the batch again.');
        await this.requireCurrentItem(tx, identity, row.before);
        if (row.after) {
          this.requireItemOwner(row.after, identity);
          const fixed = (item: IdbFacilityEnergyUseEquipment) => ({ ...item, operatingConditionsData: undefined,
            utilityData: item.utilityData.map(source => ({ ...source, energyUse: undefined })), modifiedDate: undefined });
          if (JSON.stringify(fixed(row.after)) !== JSON.stringify(fixed(row.before))) this.reject('Bulk year operations cannot change equipment settings or relationships.');
        }
      }
      for (const row of reviewed) {
        if (row.after) {
          if (JSON.stringify(row.after) !== JSON.stringify(row.before)) await tx.put('facilityEnergyUseEquipment', { ...row.after, modifiedDate: new Date() });
        }
        else await tx.deleteByKey('facilityEnergyUseEquipment', row.before.id!);
      }
    });
  }

  private async requireFacility(tx: IndexedDbTransactionContext, owner: EnergyUseOwner): Promise<void> {
    const facilities = await tx.getAllByIndex<IdbFacility>('facilities', 'guid', owner.facilityGuid);
    if (facilities.length !== 1 || facilities[0].accountId !== owner.accountGuid) this.reject('The owning facility is no longer available.');
  }
  private async requireGroup(tx: IndexedDbTransactionContext, owner: EnergyUseOwner, guid: string): Promise<IdbFacilityEnergyUseGroup> {
    const groups = await tx.getAllByIndex<IdbFacilityEnergyUseGroup>('facilityEnergyUseGroups', 'guid', guid);
    if (groups.length !== 1) this.reject('The energy-use group is no longer available.');
    const group = groups[0];
    if (group.accountId !== owner.accountGuid || group.facilityId !== owner.facilityGuid) this.reject('The energy-use group belongs to another facility.');
    return group;
  }
  private requireItemOwner(item: IdbFacilityEnergyUseEquipment, owner: EnergyUseOwner): void {
    if (item.accountId !== owner.accountGuid || item.facilityId !== owner.facilityGuid) this.reject('This energy use belongs to another account or facility.');
  }
  private async requireCurrentItem(tx: IndexedDbTransactionContext, identity: EnergyUseCommandIdentity, reviewed: IdbFacilityEnergyUseEquipment): Promise<void> {
    this.requireItemOwner(reviewed, identity);
    const rows = await tx.getAllByIndex<IdbFacilityEnergyUseEquipment>('facilityEnergyUseEquipment', 'guid', identity.energyUseGuid);
    if (rows.length !== 1 || reviewed.guid !== identity.energyUseGuid || reviewed.id === undefined
      || JSON.stringify(rows[0]) !== JSON.stringify(reviewed)) this.reject('The saved energy use changed. Reload or review it again before continuing.');
  }
  private async requireLinks(tx: IndexedDbTransactionContext, item: IdbFacilityEnergyUseEquipment): Promise<void> {
    const groups = await tx.getAllByIndex<IdbUtilityMeterGroup>('utilityMeterGroups', 'facilityId', item.facilityId);
    const meters = await tx.getAllByIndex<IdbUtilityMeter>('utilityMeter', 'facilityId', item.facilityId);
    const error = energyUseMeterLinksError(item, groups, meters);
    if (error) this.reject(error);
  }
  private reject(message: string): never { throw new WorkspaceWriteError('validation-failed', message); }

  // ---------------------------------------------------------------------------
  // Energy-use groups
  // ---------------------------------------------------------------------------

  async addGroup(group: IdbFacilityEnergyUseGroup, activeAccountGuid: string): Promise<IdbFacilityEnergyUseGroup> {
    this.assertOwnership(group.accountId, activeAccountGuid, 'energy-use group');
    return firstValueFrom(this.groupDb.addWithObservable({ ...group }));
  }

  async updateGroup(group: IdbFacilityEnergyUseGroup, activeAccountGuid: string): Promise<IdbFacilityEnergyUseGroup> {
    this.assertOwnership(group.accountId, activeAccountGuid, 'energy-use group');
    return firstValueFrom(this.groupDb.updateWithObservable({ ...group }));
  }

  async deleteGroup(group: IdbFacilityEnergyUseGroup, activeAccountGuid: string): Promise<number> {
    this.assertOwnership(group.accountId, activeAccountGuid, 'energy-use group');
    await firstValueFrom(this.groupDb.deleteWithObservable(group.id));
    return group.id;
  }

  // ---------------------------------------------------------------------------
  // Energy-use equipment
  // ---------------------------------------------------------------------------

  async addEquipment(equipment: IdbFacilityEnergyUseEquipment, activeAccountGuid: string): Promise<IdbFacilityEnergyUseEquipment> {
    this.assertOwnership(equipment.accountId, activeAccountGuid, 'energy-use equipment');
    return firstValueFrom(this.equipmentDb.addWithObservable({ ...equipment }));
  }

  async updateEquipment(equipment: IdbFacilityEnergyUseEquipment, activeAccountGuid: string): Promise<IdbFacilityEnergyUseEquipment> {
    this.assertOwnership(equipment.accountId, activeAccountGuid, 'energy-use equipment');
    return firstValueFrom(this.equipmentDb.updateWithObservable({ ...equipment }));
  }

  async deleteEquipment(equipment: IdbFacilityEnergyUseEquipment, activeAccountGuid: string): Promise<number> {
    this.assertOwnership(equipment.accountId, activeAccountGuid, 'energy-use equipment');
    await firstValueFrom(this.equipmentDb.deleteWithObservable(equipment.id));
    return equipment.id;
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
