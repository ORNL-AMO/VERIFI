import { Component, computed, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import { EnergyUseActionsService } from '../energy-use-actions.service';
import { energyUseGroup, energyUseItem, energyUsesSnapshot } from '../energy-uses.testing';
import { buildEnergyUseInventory } from './energy-use-inventory.models';
import { buildEnergyUseGroups } from './energy-use-group.models';
import { EnergyUseGroupSelectionController } from './energy-use-group-selection.controller';

@Component({ standalone: true, template: '' })
class SelectionHost {
  readonly store = inject(AccountWorkspaceStore);
  readonly key = signal('account-a');
  readonly filtersKey = signal('');
  readonly groups = computed(() => buildEnergyUseGroups('account-a', this.store.facilities(), this.store.energyUseGroups(),
    buildEnergyUseInventory('account-a', this.store.facilities(), this.store.energyUseEquipment(), this.store.energyUseGroups())));
  readonly matching = computed(() => this.groups().filter(group => !this.filtersKey() || group.name.includes(this.filtersKey())));
  readonly state = new EnergyUseGroupSelectionController(this);
}

describe('Energy-use dashboard group selection', () => {
  function setup() {
    const actions = { deleteGroups: vi.fn(async () => {}), recoverPublication: vi.fn(async () => {}) };
    TestBed.configureTestingModule({ providers: [{ provide: EnergyUseActionsService, useValue: actions }] });
    const store = TestBed.inject(AccountWorkspaceStore);
    store.publish({ ...energyUsesSnapshot([energyUseItem(), energyUseItem({ guid: 'hidden-item' }), energyUseItem({ guid: 'orphan', energyUseGroupId: 'missing' })]),
      energyUseGroups: [energyUseGroup(), energyUseGroup({ guid: 'empty', name: 'Empty' })] });
    const fixture = TestBed.createComponent(SelectionHost); fixture.detectChanges();
    return { fixture, host: fixture.componentInstance, state: fixture.componentInstance.state, store, actions };
  }
  it('selects all matching saved groups including empty groups, excludes unavailable buckets, and clears on filter/context changes', () => {
    const { fixture, host, state } = setup();
    state.toggleSelection(); state.selectAll();
    expect(state.selected()).toHaveLength(2);
    const orphan = host.groups().find(group => group.unavailable)!;
    state.select({ guid: orphan.id, selected: true });
    expect(state.selected()).toHaveLength(2);
    expect(state.actionsById()[orphan.id]).toEqual([]);
    host.filtersKey.set('Production'); fixture.detectChanges();
    expect(state.selected()).toEqual([]); expect(state.selecting()).toBe(false);
    state.toggleSelection(); state.selectAll(); expect(state.selected()).toHaveLength(1);
    host.key.set('facility-a'); fixture.detectChanges(); expect(state.selected()).toEqual([]);
  });
  it('reviews complete membership independently of matching cards, and blocks stale deletion', async () => {
    const { state, host, store, actions } = setup();
    expect(state.requestDelete(host.groups()[0].id)).toBe(true);
    expect(state.itemCount()).toBe(2);
    expect(state.review()?.groups).toHaveLength(1);
    store.publish({ ...store.snapshot()!, energyUseEquipment: [...store.energyUseEquipment(), energyUseItem({ guid: 'added' })] });
    expect(state.stale()).toBe(true); expect(await state.confirm()).toBe(false);
    expect(actions.deleteGroups).not.toHaveBeenCalled();
    state.cancel(); expect(state.review()).toBeUndefined();
  });
  it('prevents duplicate submission and keeps review on failure; committed recovery never repeats deletion', async () => {
    const { state, actions } = setup();
    state.toggleSelection(); state.selectAll(); state.requestDelete();
    actions.deleteGroups.mockRejectedValueOnce(new WorkspaceWriteError('persistence-failed', 'refresh failed', undefined, true));
    const saving = state.confirm();
    expect(await state.confirm()).toBe(false); state.cancel(); expect(state.review()).toBeDefined();
    expect(await saving).toBe(false); expect(state.committed()).toBe(true);
    state.clear(); state.cancel(); expect(state.review()).toBeDefined();
    expect(await state.confirm()).toBe(false);
    expect(await state.recover()).toBe(true);
    expect(actions.deleteGroups).toHaveBeenCalledTimes(1); expect(actions.recoverPublication).toHaveBeenCalledWith('account-a');
    expect(state.review()).toBeUndefined(); expect(state.selected()).toEqual([]); expect(state.selecting()).toBe(false);
  });
});
