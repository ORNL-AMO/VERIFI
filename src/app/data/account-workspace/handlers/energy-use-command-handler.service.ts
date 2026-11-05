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
import { EnergyUseCommandIdentity, EnergyUseOwner, energyUseMeterLinksError } from './energy-use-command.models';

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

  async deleteItem(identity: EnergyUseCommandIdentity, reviewed: IdbFacilityEnergyUseEquipment): Promise<void> {
    await this.transactions.runTransaction(['facilities', 'facilityEnergyUseEquipment'], 'readwrite', async tx => {
      await this.requireFacility(tx, identity);
      await this.requireCurrentItem(tx, identity, reviewed);
      await tx.deleteByKey('facilityEnergyUseEquipment', reviewed.id!);
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
