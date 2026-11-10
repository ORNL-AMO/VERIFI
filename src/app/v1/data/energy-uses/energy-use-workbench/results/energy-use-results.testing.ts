import { FacilityEnergyUseResultsService } from './facility-footprint/facility-energy-use-results.service';
import { FacilityEnergyUseBalanceService } from './facility-footprint/facility-energy-use-balance.service';
import { computed, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbFacilityEnergyUseEquipment } from '@data/models/idbModels/facilityEnergyUseEquipment';
import { energyUseGroup, energyUseItem, energyUseSource, energyUsesSnapshot } from '../../energy-uses.testing';
import { buildEnergyUseInventory } from '../../inventory/energy-use-inventory.models';
import { buildEnergyUseGroups } from '../../inventory/energy-use-group.models';
import { EnergyUseWorkbenchContextService } from '../energy-use-workbench-context.service';
import { EnergyUseResultsService } from './energy-use-results.service';

export function resultsEquipment(guid = 'energy-a', year = 2022, amount = 100) {
  return energyUseItem({ guid, name: `Equipment ${guid}`, utilityData: [energyUseSource({ energyUse: [{ year, energyUse: amount, energyUseUnit: 'kWh', overrideEnergyUse: true }] })] });
}

export function resultsTestContext(equipment: IdbFacilityEnergyUseEquipment[] = [resultsEquipment(), resultsEquipment('newer', 2025, 50)]) {
  const store = new AccountWorkspaceStore();
  const base = energyUsesSnapshot(equipment);
  store.publish({ ...base, account: { ...base.account, energyUnit: 'kWh' },
    facilities: base.facilities.map(row => ({ ...row, energyUnit: 'kWh', fiscalYear: 'calendarYear' })),
    energyUseGroups: [...base.energyUseGroups, energyUseGroup({ guid: 'other', name: 'Other' })] });
  const groupGuid = signal('group-a');
  const activeTab = signal('group-footprint');
  const facilities = store.facilities;
  const entries = computed(() => buildEnergyUseInventory(store.account()!.guid, facilities(), store.energyUseEquipment(), store.energyUseGroups()));
  const groups = computed(() => buildEnergyUseGroups(store.account()!.guid, facilities(), store.energyUseGroups(), entries()));
  const group = computed(() => groups().find(row => row.guid === groupGuid()));
  const context = { group, activeTab, groupLink: computed(() => ({ route: ['/v1/workspace/facility/facility-a/data/energy-uses/groups', groupGuid()] })),
    items: computed(() => group()?.items ?? []), key: computed(() => JSON.stringify([store.account()?.guid, 'facility-a', groupGuid()])),
    itemRoute: (guid: string) => ['/v1/workspace/facility/facility-a/data/energy-uses/groups', groupGuid(), 'items', guid],
    workspace: { ready: computed(() => store.status() === 'ready'), account: store.account, state: store.status, groups } };
  return { store, context, groupGuid, providers: [provideRouter([]), EnergyUseResultsService, FacilityEnergyUseResultsService, FacilityEnergyUseBalanceService,
    { provide: AccountWorkspaceStore, useValue: store }, { provide: EnergyUseWorkbenchContextService, useValue: context }] };
}
