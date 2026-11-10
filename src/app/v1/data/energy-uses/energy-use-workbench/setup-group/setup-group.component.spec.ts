import { provideRouter, Router } from '@angular/router';
import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import type { EnergyUseGroupSettings } from '@data/account-workspace/handlers/energy-use-command.models';
import { EnergyUseActionsService } from '../../energy-use-actions.service';
import { EnergyUsesModule } from '../../energy-uses.module';
import { energyUsesSnapshot } from '../../energy-uses.testing';
import { buildEnergyUseInventory } from '../../inventory/energy-use-inventory.models';
import { EnergyUseWorkbenchContextService } from '../energy-use-workbench-context.service';
import { EnergyUseWorkbenchHeaderService } from '../energy-use-workbench-header.service';
import { SetupGroupComponent } from './setup-group.component';

function setup() {
  const store = new AccountWorkspaceStore(); store.publish(energyUsesSnapshot());
  const items = computed(() => buildEnergyUseInventory('account-a', store.facilities(), store.energyUseEquipment(), store.energyUseGroups()));
  const context = { energyUseGroupGuid: signal('group-a'), facilityGuid: signal('facility-a'), energyUseGuid: signal(undefined), key: signal('group-a'),
    itemRoute: (guid: string) => ['/items', guid],
    inventoryLink: () => ({ route: ['/inventory'], queryParams: { facility: 'facility-a' } }),
    group: computed(() => store.energyUseGroups().length ? { unavailable: false } : undefined), items, workspace: { account: store.account } };
  const actions = { deleteGroup: vi.fn<EnergyUseActionsService['deleteGroup']>(async () => {}), recoverPublication: vi.fn(async () => {}), updateGroupSettings: vi.fn(async (_identity, value: EnergyUseGroupSettings) => {
    store.publish({ ...store.snapshot()!, energyUseGroups: store.energyUseGroups().map(group => ({ ...group, ...value })) }); return value;
  }) };
  TestBed.configureTestingModule({ imports: [EnergyUsesModule], providers: [provideRouter([]), EnergyUseWorkbenchHeaderService,
    { provide: AccountWorkspaceStore, useValue: store }, { provide: EnergyUseWorkbenchContextService, useValue: context },
    { provide: EnergyUseActionsService, useValue: actions }
  ] });
  const fixture = TestBed.createComponent(SetupGroupComponent); fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, store, actions, context };
}

describe('Setup Group editing', () => {
  it('offers group deletion at the bottom, reviews the complete membership, and cancels without writing', () => {
    const { fixture, component, actions } = setup();
    const button = fixture.nativeElement.querySelector('.energy-use-group-actions button') as HTMLButtonElement;
    expect(button.disabled).toBe(false); button.click(); fixture.detectChanges();
    expect(TestBed.inject(ModalPortalService).workspaceBlocked()).toBe(true);
    expect(component.deletionReview()?.items).toHaveLength(1);
    component.cancelDelete();
    expect(actions.deleteGroup).not.toHaveBeenCalled();
    expect(TestBed.inject(ModalPortalService).activePortal()).toBeNull();
    component.form.controls.name.setValue(' '); fixture.detectChanges();
    expect(button.disabled).toBe(true);
  });
  it('rejects a stale membership review, retains rejected deletes for retry, and returns to the scoped inventory after success', async () => {
    const { fixture, component, actions, store } = setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.requestDelete();
    store.publish({ ...store.snapshot()!, energyUseEquipment: store.energyUseEquipment().map(item => ({ ...item, notes: 'Changed' })) }); fixture.detectChanges();
    expect(component.deletionStale()).toBe(true); await component.confirmDelete();
    expect(actions.deleteGroup).not.toHaveBeenCalled();
    component.cancelDelete(); component.requestDelete();
    actions.deleteGroup.mockRejectedValueOnce(new Error('Write failed'));
    await component.confirmDelete();
    expect(component.deletionError()).toBe('Write failed'); expect(component.canDelete()).toBe(true);
    await component.confirmDelete();
    expect(actions.deleteGroup).toHaveBeenCalledTimes(2);
    expect(navigate).toHaveBeenCalledWith(['/inventory'], { queryParams: { facility: 'facility-a' } });
    expect(component.deletionReview()).toBeUndefined();
  });
  it('uses refresh-only recovery after committed group deletion and blocks repeated deletion or dismissal', async () => {
    const { component, actions } = setup();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    actions.deleteGroup.mockRejectedValueOnce(new WorkspaceWriteError('stale-workspace', 'Refresh failed', undefined, true));
    component.requestDelete(); await component.confirmDelete();
    expect(component.deletionCommitted()).toBe(true); expect(component.isNavigationBlocked()).toBe(true);
    component.cancelDelete(); await component.confirmDelete();
    expect(component.deletionReview()).toBeDefined(); expect(actions.deleteGroup).toHaveBeenCalledTimes(1);
    await component.recoverDeletion();
    expect(actions.recoverPublication).toHaveBeenCalledWith('account-a');
    expect(actions.deleteGroup).toHaveBeenCalledTimes(1); expect(component.deleted()).toBe(true);
  });
  it('opens without writes and autosaves normalized metadata while preserving raw equivalent text and items', async () => {
    vi.useFakeTimers();
    try {
      const { fixture, component, actions, store } = setup();
      const items = structuredClone(store.energyUseEquipment());
      expect(actions.updateGroupSettings).not.toHaveBeenCalled();
      component.form.controls.name.setValue('Packaging '); component.form.controls.notes.setValue(' Group notes '); fixture.detectChanges();
      expect(component.canManage()).toBe(false);
      await vi.advanceTimersByTimeAsync(700); fixture.detectChanges();
      expect(actions.updateGroupSettings).toHaveBeenCalledWith(expect.objectContaining({ energyUseGroupGuid: 'group-a' }),
        { name: 'Packaging', notes: 'Group notes' }, { name: 'Production', notes: '' }, expect.any(String));
      expect(component.form.controls.name.value).toBe('Packaging '); expect(component.editor.dirty()).toBe(false);
      expect(store.energyUseEquipment()).toEqual(items);
    } finally { vi.useRealTimers(); }
  });
  it('blocks blank names and preserves failed drafts for retry and navigation protection', async () => {
    const { fixture, component, actions } = setup();
    component.form.controls.name.setValue('  '); await component.editor.saveNow(); fixture.detectChanges();
    expect(component.editor.state()).toBe('invalid'); expect(actions.updateGroupSettings).not.toHaveBeenCalled();
    component.form.controls.name.setValue('Retry group'); actions.updateGroupSettings.mockRejectedValueOnce(new Error('Save unavailable'));
    await component.editor.saveNow(); fixture.detectChanges();
    expect(component.editor.state()).toBe('error'); expect(component.hasUnsavedChanges()).toBe(true); expect(component.canManage()).toBe(false);
    await component.editor.retry(); fixture.detectChanges();
    expect(component.editor.dirty()).toBe(false); expect(component.canManage()).toBe(true);
  });
  it('merges independent remote notes and reviews overlapping names', () => {
    const { fixture, component, store } = setup();
    component.form.controls.name.setValue('Local group'); fixture.detectChanges();
    store.publish({ ...store.snapshot()!, energyUseGroups: store.energyUseGroups().map(group => ({ ...group, notes: 'Remote notes' })) }); fixture.detectChanges();
    expect(component.form.getRawValue()).toEqual({ name: 'Local group', notes: 'Remote notes' });
    store.publish({ ...store.snapshot()!, energyUseGroups: store.energyUseGroups().map(group => ({ ...group, name: 'Remote group' })) }); fixture.detectChanges();
    expect(component.editor.conflicts().map(conflict => conflict.id)).toEqual(['name']);
    component.resolveConflicts({ name: 'saved' }); fixture.detectChanges();
    expect(component.form.controls.name.value).toBe('Remote group'); expect(component.editor.dirty()).toBe(false);
  });
  it('keeps a mounted draft when the saved group disappears', () => {
    const { fixture, component, store } = setup();
    component.form.controls.name.setValue('Retained group'); fixture.detectChanges();
    store.publish({ ...store.snapshot()!, energyUseGroups: [] }); fixture.detectChanges();
    expect(component.form.controls.name.value).toBe('Retained group'); expect(component.hasUnsavedChanges()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Your draft has been retained');
  });
});
