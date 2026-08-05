import { Injectable } from '@angular/core';
import { FacilityEnergyUseEquipmentDbService } from '../indexedDB/facility-energy-use-equipment-db.service';
import { FacilityEnergyUseGroupsDbService } from '../indexedDB/facility-energy-use-groups-db.service';
import { AccountWorkspaceSnapshot, WorkspaceSelections } from './account-workspace.models';

/**
 * Temporary read-compatibility bridge for issue #2576. It is removed after all
 * consumers use AccountWorkspaceStore signals. New code must not depend on it.
 */
@Injectable({ providedIn: 'root' })
export class LegacyWorkspaceStateBridge {
  constructor(
    private energyUseGroups: FacilityEnergyUseGroupsDbService,
    private energyUseEquipment: FacilityEnergyUseEquipmentDbService
  ) { }

  publish(snapshot: AccountWorkspaceSnapshot, selections: WorkspaceSelections): void {
    const facilityGuid = selections.facility?.guid;
    const byFacility = <T extends { facilityId?: string }>(items: readonly T[]) =>
      facilityGuid ? items.filter(item => item.facilityId === facilityGuid) : [];

    this.energyUseGroups.accountEnergyUseGroups.next([...snapshot.energyUseGroups]);
    this.energyUseGroups.facilityEnergyUseGroups.next(byFacility(snapshot.energyUseGroups));
    this.energyUseEquipment.accountEnergyUseEquipment.next([...snapshot.energyUseEquipment]);
    this.energyUseEquipment.facilityEnergyUseEquipment.next(byFacility(snapshot.energyUseEquipment));
    this.energyUseEquipment.selectedFacilityEnergyUseEquipment.next(selections.energyUseEquipment);
  }

  clear(): void {
    this.energyUseGroups.accountEnergyUseGroups.next([]);
    this.energyUseGroups.facilityEnergyUseGroups.next([]);
    this.energyUseEquipment.accountEnergyUseEquipment.next([]);
    this.energyUseEquipment.facilityEnergyUseEquipment.next([]);
    this.energyUseEquipment.selectedFacilityEnergyUseEquipment.next(undefined);
  }
}
