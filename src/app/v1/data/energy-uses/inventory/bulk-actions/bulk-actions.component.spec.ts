import { provideRouter } from '@angular/router';
import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import { EnergyUseActionsService } from '../../energy-use-actions.service';
import { EnergyUsesModule } from '../../energy-uses.module';
import { EnergyUseWorkbenchContextService } from '../../energy-use-workbench/energy-use-workbench-context.service';
import { buildEnergyUseInventory } from '../energy-use-inventory.models';
import { energyUseItem, energyUsesSnapshot } from '../../energy-uses.testing';
import { BulkActionsComponent } from './bulk-actions.component';

describe('Manage energy-use items', () => {
  function setup() {
    const store = new AccountWorkspaceStore();
    const base = energyUsesSnapshot(Array.from({ length: 30 }, (_, i) => energyUseItem({ guid: `item-${i}`, name: `Pump ${String(i).padStart(2, '0')}`, operatingConditionsData: [{ year: 2024, hoursOfOperation: 2000, loadFactor: 50, dutyFactor: 100, efficiency: 100 }] })));
    const snapshot = { ...base, facilities: base.facilities.map(facility => ({ ...facility, energyUnit: 'kWh' })) };
    store.publish(snapshot);
    const entries = computed(() => buildEnergyUseInventory('account-a', snapshot.facilities, store.energyUseEquipment(), snapshot.energyUseGroups));
    const context = { items: entries, key: signal('group-a'), energyUseGroupGuid: signal('group-a'), facilityGuid: signal('facility-a'),
      itemRoute: (guid: string) => ['/v1', 'workspace', 'facility', 'facility-a', 'data', 'energy-uses', 'groups', 'group-a', 'items', guid],
      workspace: { account: store.account }, energyUseGuid: signal('item-0'), routeAfterRemoval: () => ['/group/items'], navigate: vi.fn(async () => true) };
    const actions = { applyBatch: vi.fn(async () => {}), recoverPublication: vi.fn(async () => {}) };
    TestBed.configureTestingModule({ imports: [EnergyUsesModule], providers: [provideRouter([]),
      { provide: AccountWorkspaceStore, useValue: store }, { provide: EnergyUseWorkbenchContextService, useValue: context },
      { provide: EnergyUseActionsService, useValue: actions }
    ] });
    const fixture = TestBed.createComponent(BulkActionsComponent); fixture.componentRef.setInput('canOpen', true); fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, store, actions, context };
  }
  it('renders the complete group table with canonical item links and clears selection on group change', () => {
    const { fixture, component, context } = setup();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('tbody tr')).toHaveLength(30);
    expect([...root.querySelectorAll('thead th')].map(cell => cell.textContent?.trim())).toEqual(['', 'Name', 'Industrial System', 'Utility Types', 'Notes']);
    expect(root.querySelector('tbody a')?.getAttribute('href')).toBe('/v1/workspace/facility/facility-a/data/energy-uses/groups/group-a/items/item-0');
    expect(root.querySelector('input[type=search], select')).toBeNull();
    expect(root.textContent).not.toContain('Choose action');
    component.selectAllControl.setValue(true); fixture.detectChanges();
    expect(component.selection.selected()).toHaveLength(30);
    context.energyUseGroupGuid.set('other'); context.key.set('other'); fixture.detectChanges();
    expect(component.selection.selected()).toEqual([]);
  });
  it('keeps supported actions visible and disabled until items are selected, with icons beside item links', () => {
    const { fixture, component } = setup();
    const buttons = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.bulk-actions__buttons button')];
    expect(buttons.map(button => button.textContent?.trim())).toEqual(['Add energy use', 'Add year', 'Delete selected']);
    expect(buttons.every(button => button.disabled)).toBe(true);
    expect(fixture.nativeElement.querySelector('tbody th a app-ui-icon')).not.toBeNull();
    component.selectAllControl.setValue(true); fixture.detectChanges();
    expect(buttons.slice(1).every(button => !button.disabled)).toBe(true);
    fixture.componentRef.setInput('canCreate', true); fixture.detectChanges();
    expect(buttons[0].disabled).toBe(false);
    component.selection.selected.set([]); fixture.detectChanges();
    expect(buttons.slice(1).every(button => button.disabled)).toBe(true);
    expect(buttons[0].disabled).toBe(false);
  });
  it('opens deletion directly and opens the year wizard with retained selection', () => {
    const { fixture, component } = setup();
    component.selection.selectAll(); fixture.detectChanges();
    component.startOperation('delete'); fixture.detectChanges();
    expect(component.opened()).toBe(true); expect(component.selection.canConfirm()).toBe(true);
    component.close(); expect(component.selection.selected()).toHaveLength(30);
    component.startOperation('add'); fixture.detectChanges();
    expect(component.selection.review()).toBeUndefined(); expect(component.selection.canConfirm()).toBe(false);
    expect(component.yearEditor.opened()).toBe(true);
    expect(component.yearEditor.year.value).toBe(2025);
    component.yearEditor.start(); expect(component.yearEditor.drafts()).toHaveLength(30);
    expect(component.selection.selected()).toHaveLength(30);
  });
  it('invalidates review when operation values change and prevents stale confirmation', () => {
    const { fixture, component, store } = setup();
    component.selection.selectAll(); component.prepare(); fixture.detectChanges();
    expect(component.selection.canConfirm()).toBe(true);
    store.publish({ ...store.snapshot()!, energyUseEquipment: store.energyUseEquipment().map(item => ({ ...item, notes: 'Changed elsewhere' })) });
    fixture.detectChanges(); expect(component.selection.stale()).toBe(true); expect(component.selection.canConfirm()).toBe(false);
    component.selection.cancel();
    expect(component.selection.review()).toBeUndefined();
  });
  it('retains the reviewed batch through publication recovery and never repeats a durable write', async () => {
    const { component, actions, context } = setup();
    component.selection.selectAll(); component.prepare();
    actions.applyBatch.mockRejectedValueOnce(new WorkspaceWriteError('persistence-failed', 'refresh failed', undefined, true));
    await component.confirm(); expect(component.selection.committed()).toBe(true);
    component.close(); expect(component.selection.review()).toHaveLength(30);
    await component.recover();
    expect(actions.applyBatch).toHaveBeenCalledTimes(1); expect(context.navigate).not.toHaveBeenCalled();
    expect(component.selection.committed()).toBe(false);
  });
});
