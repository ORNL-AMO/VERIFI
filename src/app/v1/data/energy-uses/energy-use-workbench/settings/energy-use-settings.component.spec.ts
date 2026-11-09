import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterGroup, getNewIdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { EnergyUsesModule } from '../../energy-uses.module';
import { EnergyUseActionsService } from '../../energy-use-actions.service';
import { energyUseFacility, energyUseGroup, energyUseItem, energyUseSource } from '../../energy-uses.testing';
import { EnergyUseWorkbenchContextService } from '../energy-use-workbench-context.service';
import { applyEnergyUseSetup, energyUseSetup } from '../../models/energy-use-setup.models';
import { EnergyUseSettingsComponent } from './energy-use-settings.component';

describe('Energy Use Settings lifecycle', () => {
  function setup() {
    const facility = { ...energyUseFacility(), energyUnit: 'kWh' };
    const item = energyUseItem({ id: 1, utilityMeterGroupIds: [], utilityData: [energyUseSource()], operatingConditionsData: [] });
    const store = { account: signal({ guid: 'account-a' }), canWrite: signal(true), hasPending: signal(false), pendingOperations: signal<readonly { readonly ownerId?: string }[]>([]),
      energyUseEquipment: signal([item]), facilities: signal([facility]), energyUseGroups: signal([energyUseGroup()]), meterGroups: signal<IdbUtilityMeterGroup[]>([]), meters: signal<IdbUtilityMeter[]>([]) };
    const guid = signal('energy-a');
    const actions = { updateSetup: vi.fn(async (_identity, value, _base, _owner, approvals) => {
      const saved = applyEnergyUseSetup(store.energyUseEquipment()[0], value, facility, approvals);
      store.energyUseEquipment.set([saved]); return energyUseSetup(saved);
    }), copy: vi.fn(async () => ({ ...item, guid: 'copy-a' })), delete: vi.fn(async () => { store.energyUseEquipment.set([]); }),
      recoverPublication: vi.fn(async (_accountGuid: string) => { store.energyUseEquipment.set([]); }) };
    const navigation = { openFacilityInventory: vi.fn(async () => true) };
    TestBed.configureTestingModule({ imports: [EnergyUsesModule], providers: [provideRouter([]),
      { provide: AccountWorkspaceStore, useValue: store }, { provide: EnergyUseActionsService, useValue: actions },
      { provide: WorkspaceNavigationService, useValue: navigation },
      { provide: EnergyUseWorkbenchContextService, useValue: { energyUseGuid: guid, facilityGuid: signal('facility-a'), energyUseGroupGuid: signal('group-a'),
        item: computed(() => { const item = store.energyUseEquipment().find(item => item.guid === guid()); return item ? { item } : undefined; }),
        routeAfterRemoval: () => ['/group/items'], navigate: navigation.openFacilityInventory } }] });
    const fixture = TestBed.createComponent(EnergyUseSettingsComponent); fixture.detectChanges(); fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, store, actions, navigation, guid };
  }
  it('opens pristine without writes and autosaves the normalized value while retaining raw text', async () => {
    vi.useFakeTimers();
    try {
      const { fixture, component, actions } = setup();
      expect(component.editor.dirty()).toBe(false); expect(actions.updateSetup).not.toHaveBeenCalled();
      component.form()!.controls.settings.controls.name.setValue('New name '); fixture.detectChanges();
      await vi.advanceTimersByTimeAsync(700); fixture.detectChanges();
      expect(actions.updateSetup.mock.calls[0][1].name).toBe('New name');
      expect(component.form()!.controls.settings.controls.name.value).toBe('New name '); expect(component.editor.dirty()).toBe(false);
    } finally { vi.useRealTimers(); }
  });
  it('copies a year coherently before pending edits have autosaved', async () => {
    vi.useFakeTimers();
    try {
      const { fixture, component, store, actions } = setup();
      store.energyUseEquipment.set([{ ...store.energyUseEquipment()[0], operatingConditionsData: [{ year: 2024, hoursOfOperation: 1000, loadFactor: 100, dutyFactor: 100, efficiency: 100 }],
        utilityData: [energyUseSource({ energyUse: [{ year: 2024, energyUse: 5000, overrideEnergyUse: false, energyUseUnit: 'kWh' }] })] }]);
      fixture.detectChanges();
      component.form()!.controls.conditions.at(0).controls.hoursOfOperation.setValue(2000);
      component.openYearDrawer(2024); fixture.detectChanges();
      expect(actions.updateSetup).not.toHaveBeenCalled();
      component.yearForm.controls.year.setValue(2025); component.confirmYear(); fixture.detectChanges();
      await vi.advanceTimersByTimeAsync(700); fixture.detectChanges();
      expect(actions.updateSetup).toHaveBeenCalledTimes(1);
      expect(store.energyUseEquipment()[0].utilityData[0].energyUse.map(row => row.energyUse)).toEqual([10000, 10000]);
      expect(component.editor.dirty()).toBe(false);
    } finally { vi.useRealTimers(); }
  });
  it('disables year actions during its own save while retaining editable annual fields and later edits', async () => {
    vi.useFakeTimers();
    try {
      const { fixture, component, store, actions } = setup();
      store.energyUseEquipment.set([{ ...store.energyUseEquipment()[0], operatingConditionsData: [{ year: 2024, hoursOfOperation: 1000, loadFactor: 100, dutyFactor: 100, efficiency: 100 }] }]);
      fixture.detectChanges();
      const annual = fixture.nativeElement.querySelector('app-energy-use-annual-data-fields') as HTMLElement;
      const buttons = [...annual.querySelectorAll<HTMLButtonElement>('.annual-data__heading button')];
      expect(buttons).toHaveLength(3); expect(buttons.every(button => !button.disabled)).toBe(true);
      let complete!: (value: ReturnType<typeof energyUseSetup>) => void;
      actions.updateSetup.mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
      component.form()!.controls.settings.controls.name.setValue('Saving setup');
      const saving = component.editor.saveNow();
      const committed = applyEnergyUseSetup(store.energyUseEquipment()[0], actions.updateSetup.mock.calls[0][1], component.facility()!);
      store.pendingOperations.set([{ ownerId: component.editor.ownerId }]); store.hasPending.set(true); store.canWrite.set(false);
      fixture.detectChanges();
      try {
        expect(component.editor.canEdit()).toBe(true); expect(buttons.every(button => button.disabled)).toBe(true);
        const hours = annual.querySelector<HTMLInputElement>('input[formcontrolname="hoursOfOperation"]')!;
        expect(hours.matches(':disabled')).toBe(false);
        component.form()!.controls.conditions.at(0).controls.hoursOfOperation.setValue(2000);
        buttons.forEach(button => button.click());
        expect(component.yearDrawer()).toBeUndefined(); expect(component.review()).toBeUndefined();
        store.energyUseEquipment.set([committed]); store.canWrite.set(true); store.hasPending.set(false); store.pendingOperations.set([]);
        complete(energyUseSetup(committed)); await saving; fixture.detectChanges();
        expect(buttons.every(button => !button.disabled)).toBe(true);
        await component.editor.saveNow(); fixture.detectChanges();
        expect(store.energyUseEquipment()[0].operatingConditionsData[0].hoursOfOperation).toBe(2000);
        expect(component.editor.dirty()).toBe(false);
      } finally {
        store.canWrite.set(true); store.hasPending.set(false); store.pendingOperations.set([]);
        complete(energyUseSetup(committed)); await saving; fixture.destroy();
      }
    } finally { vi.useRealTimers(); }
  });
  it('defaults an empty history to the owning facility previous fiscal-year label', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 10, 5, 12));
    try {
      const { fixture, component, store, actions } = setup();
      store.facilities.set([{ ...store.facilities()[0], fiscalYear: 'nonCalendarYear', fiscalYearMonth: 6, fiscalYearCalendarEnd: true }]);
      store.energyUseEquipment.set([{ ...store.energyUseEquipment()[0], utilityData: store.energyUseEquipment()[0].utilityData.map(source => ({ ...source, energyUse: [] })) }]);
      fixture.detectChanges(); component.openYearDrawer(); fixture.detectChanges();
      expect(component.yearForm.controls.year.value).toBe(2026); expect(actions.updateSetup).not.toHaveBeenCalled();
      component.closeYearDrawer(); fixture.destroy();
    } finally { vi.useRealTimers(); }
  });
  it('accepts a remote year deletion once while retaining unrelated local metadata', async () => {
    const { fixture, component, store } = setup();
    store.energyUseEquipment.set([{ ...store.energyUseEquipment()[0], operatingConditionsData: [{ year: 2024, hoursOfOperation: 1000, loadFactor: 100, dutyFactor: 100, efficiency: 100 }] }]);
    fixture.detectChanges();
    component.form()!.controls.settings.controls.name.setValue('Keep my name');
    component.form()!.controls.conditions.at(0).controls.hoursOfOperation.setValue(2000);
    const remote = { ...store.energyUseEquipment()[0], operatingConditionsData: [], utilityData: [energyUseSource({ energyUse: [] })] };
    store.energyUseEquipment.set([remote]); fixture.detectChanges();
    expect(component.editor.conflicts()).toEqual([expect.objectContaining({ id: 'removed-year.2024', allowedChoices: ['saved'] })]);
    expect(component.form()!.controls.consumption.at(0).controls.entries.length).toBe(1);
    store.energyUseEquipment.set([{ ...remote, notes: 'Keep remote notes' }]); fixture.detectChanges();
    component.resolveConflicts({ 'removed-year.2024': 'saved' }); fixture.detectChanges();
    await component.editor.saveNow(); fixture.detectChanges();
    expect(component.editor.conflicts()).toEqual([]); expect(component.editor.dirty()).toBe(false);
    expect(store.energyUseEquipment()[0]).toMatchObject({ name: 'Keep my name', notes: 'Keep remote notes', operatingConditionsData: [] });
    expect(store.energyUseEquipment()[0].utilityData[0].energyUse).toEqual([]);
  });
  it('retains failed drafts for retry and protects a missing saved target', async () => {
    const { fixture, component, store, actions } = setup();
    actions.updateSetup.mockRejectedValueOnce(new Error('Disk unavailable'));
    component.form()!.controls.settings.controls.name.setValue('Unsaved'); await component.editor.saveNow(); fixture.detectChanges();
    expect(component.editor.state()).toBe('error'); expect(component.editor.dirty()).toBe(true);
    expect(TestBed.inject(UnsavedChangesService).hasUnsavedChanges()).toBe(true);
    store.energyUseEquipment.set([]); fixture.detectChanges();
    expect(component.form()!.controls.settings.controls.name.value).toBe('Unsaved'); expect(component.editor.canEdit()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Your draft has been retained');
  });
  it('retries a failed draft and discards queued work synchronously', async () => {
    const { fixture, component, actions } = setup();
    actions.updateSetup.mockRejectedValueOnce(new Error('Retry me'));
    component.form()!.controls.settings.controls.name.setValue('Retried'); await component.editor.saveNow();
    await component.editor.saveNow(); fixture.detectChanges(); expect(component.editor.dirty()).toBe(false);
    component.form()!.controls.settings.controls.name.setValue('Discard me'); component.editor.discard(); fixture.detectChanges();
    expect(component.form()!.controls.settings.controls.name.value).toBe('Retried'); expect(component.editor.dirty()).toBe(false);
  });
  it('reviews source history and rejects an obsolete confirmation', async () => {
    const { fixture, component, store } = setup();
    component.requestRemoveSource({ energySource: 'Electricity' }); fixture.detectChanges();
    expect(TestBed.inject(ModalPortalService).activePortal()).not.toBeNull(); expect(component.removalYears()).toContain('manual override');
    store.energyUseEquipment.set([{ ...store.energyUseEquipment()[0], notes: 'Changed elsewhere' }]); fixture.detectChanges();
    expect(component.reviewStale()).toBe(true); await component.confirmReview(); expect(component.form()!.controls.settings.controls.sources.length).toBe(1);
    component.cancelReview(); fixture.detectChanges(); component.requestRemoveSource({ energySource: 'Electricity' });
    await component.confirmReview(); fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    expect(store.energyUseEquipment()[0].utilityData).toEqual([]);
  });
  it('keeps a confirmed utility replacement unchanged until its saved-history review is accepted', async () => {
    const { fixture, component, store, actions } = setup();
    const baseline = component.form()!.controls.settings.controls.sources.getRawValue();
    component.requestUtilities({ baseline, selected: ['Natural Gas'] }); fixture.detectChanges();
    expect(component.form()!.controls.settings.controls.sources.getRawValue()).toEqual(baseline);
    expect(actions.updateSetup).not.toHaveBeenCalled();
    component.cancelReview(); fixture.detectChanges();
    expect(component.form()!.controls.settings.controls.sources.getRawValue()).toEqual(baseline);
    component.requestUtilities({ baseline, selected: ['Natural Gas'] });
    await component.confirmReview(); fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    expect(store.energyUseEquipment()[0].utilityData.map(source => source.energySource)).toEqual(['Natural Gas']);
    expect(actions.updateSetup).toHaveBeenCalledTimes(1);
  });
  it('reviews removed history before changing meter-group links and derived utilities together', async () => {
    const { fixture, component, store, actions } = setup();
    const gasGroup = { ...getNewIdbUtilityMeterGroup('Energy', 'Gas', 'facility-a', 'account-a'), guid: 'gas-group' };
    store.meterGroups.set([gasGroup]);
    store.meters.set([{ guid: 'gas-meter', accountId: 'account-a', facilityId: 'facility-a', groupId: gasGroup.guid, source: 'Natural Gas' } as IdbUtilityMeter]);
    fixture.detectChanges();
    const selection = { baseline: [], selected: [gasGroup.guid], utilities: {
      baseline: component.form()!.controls.settings.controls.sources.getRawValue(), selected: ['Natural Gas'] as const } };
    component.requestMeterGroups(selection); fixture.detectChanges();
    expect(component.form()!.controls.settings.controls.utilityMeterGroupIds.value).toEqual([]);
    expect(component.form()!.controls.settings.controls.sources.getRawValue().map(row => row.energySource)).toEqual(['Electricity']);
    expect(actions.updateSetup).not.toHaveBeenCalled();
    component.cancelReview(); fixture.detectChanges(); component.requestMeterGroups(selection);
    await component.confirmReview(); fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    expect(store.energyUseEquipment()[0].utilityMeterGroupIds).toEqual([gasGroup.guid]);
    expect(store.energyUseEquipment()[0].utilityData.map(row => row.energySource)).toEqual(['Natural Gas']);
    expect(actions.updateSetup).toHaveBeenCalledTimes(1);
  });
  it.each([['Electricity', ['electric-group']], ['Other Energy', []]] as const)('reviews manual %s selection and retains only compatible group links', async (selected, expectedLinks) => {
    const { fixture, component, store, actions } = setup();
    const groups = ['electric-group', 'gas-group'].map((guid, index) => ({ ...getNewIdbUtilityMeterGroup('Energy', index ? 'Gas meters' : 'Electric meters', 'facility-a', 'account-a'), guid }));
    store.meterGroups.set(groups);
    store.meters.set(groups.map((group, index) => ({ guid: `${group.guid}-meter`, accountId: 'account-a', facilityId: 'facility-a', groupId: group.guid, source: index ? 'Natural Gas' : 'Electricity' } as IdbUtilityMeter)));
    store.energyUseEquipment.set([{ ...store.energyUseEquipment()[0], utilityMeterGroupIds: groups.map(group => group.guid),
      utilityData: [energyUseSource(), energyUseSource({ energySource: 'Natural Gas' })] }]);
    fixture.detectChanges();
    const selection = { baseline: component.form()!.controls.settings.controls.sources.getRawValue(), selected: [selected] };
    component.requestUtilities(selection); fixture.detectChanges();
    expect(component.unlinkedGroups().length).toBeGreaterThan(0);
    expect(actions.updateSetup).not.toHaveBeenCalled();
    component.cancelReview(); fixture.detectChanges();
    expect(store.energyUseEquipment()[0].utilityMeterGroupIds).toEqual(groups.map(group => group.guid));
    component.requestUtilities(selection); await component.confirmReview(); fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    expect(store.energyUseEquipment()[0].utilityMeterGroupIds).toEqual(expectedLinks);
    expect(store.energyUseEquipment()[0].utilityData.map(source => source.energySource)).toEqual([selected]);
    expect(actions.updateSetup).toHaveBeenCalledTimes(1);
  });
  it('copies only saved values and deletes the confirmed item before returning to its inventory', async () => {
    const { fixture, component, actions, navigation } = setup();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.form()!.controls.settings.controls.name.setValue('Pending'); fixture.detectChanges(); await component.copy(); expect(actions.copy).not.toHaveBeenCalled();
    component.editor.discard(); fixture.detectChanges(); await component.copy(); expect(actions.copy).toHaveBeenCalledTimes(1);
    component.requestDelete(); await component.confirmReview();
    expect(actions.delete).toHaveBeenCalledTimes(1); expect(navigation.openFacilityInventory).toHaveBeenCalledWith(['/group/items']);
  });
  it('retries a rejected deletion without discarding its draft before persistence succeeds', async () => {
    const { fixture, component, actions, navigation } = setup();
    component.form()!.controls.settings.controls.name.setValue('Keep my draft');
    fixture.detectChanges();
    actions.delete.mockRejectedValueOnce(new WorkspaceWriteError('persistence-failed', 'Write rejected'));
    component.requestDelete();
    await component.confirmReview();
    fixture.detectChanges();
    expect(component.deletionRecovery()).toBeUndefined();
    expect(component.form()!.controls.settings.controls.name.value).toBe('Keep my draft');
    expect(component.editor.dirty()).toBe(true);
    expect(navigation.openFacilityInventory).not.toHaveBeenCalled();
    await component.confirmReview();
    expect(actions.delete).toHaveBeenCalledTimes(2);
    expect(actions.recoverPublication).not.toHaveBeenCalled();
    expect(component.editor.dirty()).toBe(false);
    expect(navigation.openFacilityInventory).toHaveBeenCalledWith(['/group/items']);
  });
  it('recovers a committed deletion without another write and retains its draft until refresh succeeds', async () => {
    const { fixture, component, actions, navigation } = setup();
    component.form()!.controls.settings.controls.name.setValue('Keep until refreshed');
    fixture.detectChanges();
    actions.delete.mockRejectedValueOnce(new WorkspaceWriteError('persistence-failed', 'Reload failed', undefined, true));
    actions.recoverPublication.mockRejectedValueOnce(new Error('Still unavailable'));
    component.requestDelete();
    await component.confirmReview();
    fixture.detectChanges();
    expect(component.deletionRecovery()).toMatchObject({ accountGuid: 'account-a', destination: ['/group/items'] });
    expect(component.isNavigationBlocked()).toBe(true);
    expect(component.canCommand()).toBe(false);
    component.cancelReview();
    await component.confirmReview();
    expect(component.review()?.kind).toBe('delete');
    expect(actions.delete).toHaveBeenCalledTimes(1);
    await component.recoverDeletion();
    fixture.detectChanges();
    expect(component.actionError()).toBe('Still unavailable');
    expect(component.editor.dirty()).toBe(true);
    expect(component.form()!.controls.settings.controls.name.value).toBe('Keep until refreshed');
    expect(navigation.openFacilityInventory).not.toHaveBeenCalled();
    await component.recoverDeletion();
    fixture.detectChanges();
    expect(actions.recoverPublication).toHaveBeenCalledTimes(2);
    expect(actions.recoverPublication).toHaveBeenLastCalledWith('account-a');
    expect(actions.delete).toHaveBeenCalledTimes(1);
    expect(component.editor.dirty()).toBe(false);
    expect(component.review()).toBeUndefined();
    expect(component.deletionRecovery()).toBeUndefined();
    expect(navigation.openFacilityInventory).toHaveBeenCalledWith(['/group/items']);
  });
  it('does not complete deletion recovery after the editor identity changes', async () => {
    const { fixture, component, actions, navigation, guid } = setup();
    actions.delete.mockRejectedValueOnce(new WorkspaceWriteError('persistence-failed', 'Reload failed', undefined, true));
    component.requestDelete();
    await component.confirmReview();
    let finish!: () => void;
    actions.recoverPublication.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const recovery = component.recoverDeletion();
    guid.set('another-item');
    fixture.detectChanges();
    finish();
    await recovery;
    expect(navigation.openFacilityInventory).not.toHaveBeenCalled();
    expect(actions.delete).toHaveBeenCalledTimes(1);
    expect(component.deletionRecovery()).toBeUndefined();
    expect(component.isNavigationBlocked()).toBe(false);
  });
});
