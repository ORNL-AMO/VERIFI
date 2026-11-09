import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import { EnergyUseActionsService } from '../energy-use-actions.service';
import { energyUsesSnapshot } from '../energy-uses.testing';
import { EnergyUseSelectionController } from './energy-use-selection.controller';
@Component({ standalone: true, template: '' })
class SelectionHost {
  readonly context = signal({ resource: 'energy-uses' as const, accountGuid: 'account-a', facilityGuid: 'facility-a', energyUseGroupGuid: 'group-a' });
  readonly filters = signal('all'); readonly ids = signal(['energy-a']);
  readonly selection = new EnergyUseSelectionController({ context: this.context, filtersKey: this.filters, matchingGuids: this.ids, scopeGuids: this.ids });
}
describe('Energy use group selection', () => {
  function setup() {
    const actions = { applyBatch: vi.fn(async () => {}), recoverPublication: vi.fn(async () => {}) };
    TestBed.configureTestingModule({ providers: [{ provide: EnergyUseActionsService, useValue: actions }] });
    TestBed.inject(AccountWorkspaceStore).publish(energyUsesSnapshot());
    const fixture = TestBed.createComponent(SelectionHost); fixture.detectChanges();
    return { fixture, host: fixture.componentInstance, state: fixture.componentInstance.selection, actions };
  }
  it('selects all matching records and clears selection when filters or group change', () => {
    const { fixture, host, state } = setup(); state.toggleSelection(); state.selectAll(); expect(state.selected()).toEqual(['energy-a']);
    host.filters.set('pumps'); fixture.detectChanges(); expect(state.selected()).toEqual([]);
    state.toggleSelection(); state.selectAll(); host.context.set({ ...host.context(), energyUseGroupGuid: 'other' }); fixture.detectChanges(); expect(state.selecting()).toBe(false);
  });
  it('offers refresh recovery after a committed error and never resubmits the batch', async () => {
    const { state, actions } = setup(); state.toggleSelection(); state.selectAll(); state.prepare({ kind: 'delete' });
    actions.applyBatch.mockRejectedValueOnce(new WorkspaceWriteError('persistence-failed', 'refresh failed', undefined, true));
    expect(await state.confirm()).toBe(false); expect(state.committed()).toBe(true); expect(await state.confirm()).toBe(false);
    expect(await state.recover()).toBe(true); expect(actions.applyBatch).toHaveBeenCalledTimes(1); expect(state.selected()).toEqual([]);
  });
});
