/**
 * Persistence-only handler for energy-use group and equipment commands.
 */
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { FacilityEnergyUseEquipmentDbService } from '../../indexedDB/facility-energy-use-equipment-db.service';
import { FacilityEnergyUseGroupsDbService } from '../../indexedDB/facility-energy-use-groups-db.service';
import { IdbFacilityEnergyUseEquipment } from '../../models/idbModels/facilityEnergyUseEquipment';
import { IdbFacilityEnergyUseGroup } from '../../models/idbModels/facilityEnergyUseGroups';
import { WorkspaceWriteError } from '../workspace-commands.models';

@Injectable({ providedIn: 'root' })
export class EnergyUseCommandHandler {
  constructor(
    private readonly groupDb: FacilityEnergyUseGroupsDbService,
    private readonly equipmentDb: FacilityEnergyUseEquipmentDbService
  ) { }

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
