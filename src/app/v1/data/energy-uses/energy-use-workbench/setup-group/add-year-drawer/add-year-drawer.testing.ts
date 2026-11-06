import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { EnergyUseBatchChange } from '@data/account-workspace/handlers/energy-use-command.models';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { EnergyUseActionsService } from '../../../energy-use-actions.service';
import { EnergyUseWorkbenchContextService } from '../../energy-use-workbench-context.service';
import { EnergyUsesModule } from '../../../energy-uses.module';
import { energyUseItem, energyUsesSnapshot } from '../../../energy-uses.testing';
import { buildEnergyUseInventory } from '../../../inventory/energy-use-inventory.models';
import { AddYearController } from './add-year.controller';

export function setupYearController(count = 3) {
  const store = new AccountWorkspaceStore(), canOpen = signal(true);
  const snapshot = energyUsesSnapshot(Array.from({ length: count }, (_, i) => energyUseItem({ guid: `item-${i}`, name: `Pump ${i}`, operatingConditionsData: [{ year: 2024, hoursOfOperation: 2000, loadFactor: 50, dutyFactor: 100, efficiency: 100 }] })));
  store.publish({ ...snapshot, facilities: snapshot.facilities.map(facility => ({ ...facility, energyUnit: 'kWh' })) });
  const entries = computed(() => buildEnergyUseInventory('account-a', store.facilities(), store.energyUseEquipment(), store.energyUseGroups()).filter(entry => entry.item.energyUseGroupId === 'group-a'));
  const context = { items: entries, key: signal('group-a'), facilityGuid: signal('facility-a'), energyUseGroupGuid: signal('group-a'), itemRoute: (guid: string) => ['/group/items', guid], workspace: { account: store.account } } as unknown as EnergyUseWorkbenchContextService;
  const actions = { applyBatch: vi.fn(async (_accountGuid: string, _changes: readonly EnergyUseBatchChange[]) => {}), recoverPublication: vi.fn(async (_accountGuid: string) => {}) };
  const reload = vi.fn(async () => 'loaded' as const);
  TestBed.configureTestingModule({ imports: [EnergyUsesModule], providers: [provideRouter([]),
    { provide: AccountWorkspaceStore, useValue: store }, { provide: EnergyUseWorkbenchContextService, useValue: context },
    { provide: EnergyUseActionsService, useValue: actions }, { provide: AccountWorkspaceService, useValue: { reloadActiveWorkspace: reload } }
  ] });
  const controller = TestBed.runInInjectionContext(() => new AddYearController(context, canOpen));
  controller.open(store.energyUseEquipment().map(item => item.guid));
  return { controller, store, actions, reload, canOpen, context };
}
