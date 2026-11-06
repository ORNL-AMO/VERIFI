import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import { EnergyUseActionsService } from '../../energy-use-actions.service';
import { energyUseItem, energyUsesSnapshot } from '../../energy-uses.testing';
import { buildEnergyUseGroups } from '../../inventory/energy-use-group.models';
import { buildEnergyUseInventory } from '../../inventory/energy-use-inventory.models';
import { EnergyUseSelectionController } from './energy-use-selection.controller';
@Component({ standalone: true, template: '' })
class SelectionHost {
  readonly identity = signal({ accountGuid: 'account-a', facilityGuid: 'facility-a', energyUseGroupGuid: 'group-a' });
  readonly members = signal([energyUseItem()]);
  readonly selection = new EnergyUseSelectionController({ identity: this.identity, members: this.members });
}
describe('Energy use group selection', () => {
  function setup() {
    const actions = { applyBatch: vi.fn(async () => {}), recoverPublication: vi.fn(async () => {}) };
    TestBed.configureTestingModule({ providers: [{ provide: EnergyUseActionsService, useValue: actions }] });
    TestBed.inject(AccountWorkspaceStore).publish(energyUsesSnapshot());
    const fixture = TestBed.createComponent(SelectionHost); fixture.detectChanges();
    return { fixture, host: fixture.componentInstance, state: fixture.componentInstance.selection, actions, store: TestBed.inject(AccountWorkspaceStore) };
  }
  it('selects all group members, drops unavailable members, and clears selection when the group changes', () => {
    const { fixture, host, state } = setup();
    state.selectAll();
    expect(state.selected()).toEqual(['energy-a']);
    host.members.set([]);
    fixture.detectChanges();
    expect(state.selected()).toEqual([]);
    host.members.set([energyUseItem()]);
    fixture.detectChanges();
    state.selectAll();
    host.identity.set({ ...host.identity(), energyUseGroupGuid: 'other' });
    fixture.detectChanges();
    expect(state.selected()).toEqual([]);
  });
  it.each(['accountId', 'facilityId', 'energyUseGroupId'] as const)('rejects an item with changed %s before reviewing deletion', field => {
    const { state, store } = setup();
    state.selectAll();
    store.publish({ ...store.snapshot()!, energyUseEquipment: store.energyUseEquipment().map(item => ({ ...item, [field]: 'other' })) });
    state.prepareDelete();
    expect(state.review()).toBeUndefined();
    expect(state.canConfirm()).toBe(false);
    expect(state.error()).toContain('changed');
  });
  it('reviews orphan equipment from the synthetic unavailable group without changing its stored group', () => {
    const { fixture, host, state, store } = setup();
    const orphan = { ...store.energyUseEquipment()[0], energyUseGroupId: 'missing-original-group' };
    store.publish({ ...store.snapshot()!, energyUseEquipment: [orphan] });
    const entries = buildEnergyUseInventory('account-a', store.facilities(), store.energyUseEquipment(), store.energyUseGroups());
    const group = buildEnergyUseGroups('account-a', store.facilities(), store.energyUseGroups(), entries).find(group => group.unavailable)!;
    host.identity.set({ ...host.identity(), energyUseGroupGuid: group.guid });
    host.members.set(group.items.map(entry => entry.item));
    fixture.detectChanges();

    state.selectAll();
    state.prepareDelete();
    expect(state.canConfirm()).toBe(true);
    expect(state.review()?.[0].item.energyUseGroupId).toBe('missing-original-group');
    expect(store.energyUseEquipment()[0].energyUseGroupId).toBe('missing-original-group');
  });
  it('offers refresh recovery after a committed error and never resubmits the batch', async () => {
    const { state, actions } = setup(); state.selectAll(); state.prepareDelete();
    actions.applyBatch.mockRejectedValueOnce(new WorkspaceWriteError('persistence-failed', 'refresh failed', undefined, true));
    expect(await state.confirm()).toBe(false); expect(state.committed()).toBe(true); expect(await state.confirm()).toBe(false);
    expect(await state.recover()).toBe(true); expect(actions.applyBatch).toHaveBeenCalledTimes(1); expect(state.selected()).toEqual([]);
  });
});
