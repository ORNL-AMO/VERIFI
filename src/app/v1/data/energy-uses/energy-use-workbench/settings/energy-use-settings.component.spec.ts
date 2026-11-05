import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterGroup, getNewIdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { EnergyUsesModule } from '../../energy-uses.module';
import { EnergyUseActionsService } from '../../energy-use-actions.service';
import { energyUseFacility, energyUseGroup, energyUseItem, energyUseSource } from '../../energy-uses.testing';
import { EnergyUseWorkbenchContextService } from '../energy-use-workbench-context.service';
import { applyEnergyUseSettings, energyUseSettings } from '../../models/energy-use-settings.models';
import { EnergyUseSettingsComponent } from './energy-use-settings.component';

describe('Energy Use Settings lifecycle', () => {
  function setup() {
    const facility = { ...energyUseFacility(), energyUnit: 'kWh' };
    const item = energyUseItem({ id: 1, utilityMeterGroupIds: [], utilityData: [energyUseSource()], operatingConditionsData: [] });
    const store = { account: signal({ guid: 'account-a' }), canWrite: signal(true), hasPending: signal(false), pendingOperations: signal([]),
      energyUseEquipment: signal([item]), facilities: signal([facility]), energyUseGroups: signal([energyUseGroup()]), meterGroups: signal<IdbUtilityMeterGroup[]>([]), meters: signal<IdbUtilityMeter[]>([]) };
    const guid = signal('energy-a');
    const actions = { updateSettings: vi.fn(async (_identity, value, _base, _owner, approvals) => {
      const saved = applyEnergyUseSettings(store.energyUseEquipment()[0], value, facility, approvals);
      store.energyUseEquipment.set([saved]); return energyUseSettings(saved);
    }), copy: vi.fn(async () => ({ ...item, guid: 'copy-a' })), delete: vi.fn(async () => { store.energyUseEquipment.set([]); }) };
    const navigation = { openFacilityInventory: vi.fn(async () => true) };
    TestBed.configureTestingModule({ imports: [EnergyUsesModule], providers: [provideRouter([]),
      { provide: AccountWorkspaceStore, useValue: store }, { provide: EnergyUseActionsService, useValue: actions },
      { provide: WorkspaceNavigationService, useValue: navigation },
      { provide: EnergyUseWorkbenchContextService, useValue: { energyUseGuid: guid, facilityGuid: signal('facility-a') } }] });
    const fixture = TestBed.createComponent(EnergyUseSettingsComponent); fixture.detectChanges(); fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, store, actions, navigation, guid };
  }
  it('opens pristine without writes and autosaves the normalized value while retaining raw text', async () => {
    vi.useFakeTimers();
    try {
      const { fixture, component, actions } = setup();
      expect(component.editor.dirty()).toBe(false); expect(actions.updateSettings).not.toHaveBeenCalled();
      component.form()!.controls.name.setValue('New name '); fixture.detectChanges();
      await vi.advanceTimersByTimeAsync(700); fixture.detectChanges();
      expect(actions.updateSettings.mock.calls[0][1].name).toBe('New name');
      expect(component.form()!.controls.name.value).toBe('New name '); expect(component.editor.dirty()).toBe(false);
    } finally { vi.useRealTimers(); }
  });
  it('retains failed drafts for retry and protects a missing saved target', async () => {
    const { fixture, component, store, actions } = setup();
    actions.updateSettings.mockRejectedValueOnce(new Error('Disk unavailable'));
    component.form()!.controls.name.setValue('Unsaved'); await component.editor.saveNow(); fixture.detectChanges();
    expect(component.editor.state()).toBe('error'); expect(component.editor.dirty()).toBe(true);
    expect(TestBed.inject(UnsavedChangesService).hasUnsavedChanges()).toBe(true);
    store.energyUseEquipment.set([]); fixture.detectChanges();
    expect(component.form()!.controls.name.value).toBe('Unsaved'); expect(component.editor.canEdit()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Your draft has been retained');
  });
  it('retries a failed draft and discards queued work synchronously', async () => {
    const { fixture, component, actions } = setup();
    actions.updateSettings.mockRejectedValueOnce(new Error('Retry me'));
    component.form()!.controls.name.setValue('Retried'); await component.editor.saveNow();
    await component.editor.saveNow(); fixture.detectChanges(); expect(component.editor.dirty()).toBe(false);
    component.form()!.controls.name.setValue('Discard me'); component.editor.discard(); fixture.detectChanges();
    expect(component.form()!.controls.name.value).toBe('Retried'); expect(component.editor.dirty()).toBe(false);
  });
  it('reviews source history and rejects an obsolete confirmation', async () => {
    const { fixture, component, store } = setup();
    component.requestRemoveSource({ energySource: 'Electricity' }); fixture.detectChanges();
    expect(TestBed.inject(ModalPortalService).activePortal()).not.toBeNull(); expect(component.removalYears()).toContain('manual override');
    store.energyUseEquipment.set([{ ...store.energyUseEquipment()[0], notes: 'Changed elsewhere' }]); fixture.detectChanges();
    expect(component.reviewStale()).toBe(true); await component.confirmReview(); expect(component.form()!.controls.sources.length).toBe(1);
    component.cancelReview(); fixture.detectChanges(); component.requestRemoveSource({ energySource: 'Electricity' });
    await component.confirmReview(); fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    expect(store.energyUseEquipment()[0].utilityData).toEqual([]);
  });
  it('keeps a confirmed utility replacement unchanged until its saved-history review is accepted', async () => {
    const { fixture, component, store, actions } = setup();
    const baseline = component.form()!.controls.sources.getRawValue();
    component.requestUtilities({ baseline, selected: ['Natural Gas'] }); fixture.detectChanges();
    expect(component.form()!.controls.sources.getRawValue()).toEqual(baseline);
    expect(actions.updateSettings).not.toHaveBeenCalled();
    component.cancelReview(); fixture.detectChanges();
    expect(component.form()!.controls.sources.getRawValue()).toEqual(baseline);
    component.requestUtilities({ baseline, selected: ['Natural Gas'] });
    await component.confirmReview(); fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    expect(store.energyUseEquipment()[0].utilityData.map(source => source.energySource)).toEqual(['Natural Gas']);
    expect(actions.updateSettings).toHaveBeenCalledTimes(1);
  });
  it('reviews removed history before changing meter-group links and derived utilities together', async () => {
    const { fixture, component, store, actions } = setup();
    const gasGroup = { ...getNewIdbUtilityMeterGroup('Energy', 'Gas', 'facility-a', 'account-a'), guid: 'gas-group' };
    store.meterGroups.set([gasGroup]);
    store.meters.set([{ guid: 'gas-meter', accountId: 'account-a', facilityId: 'facility-a', groupId: gasGroup.guid, source: 'Natural Gas' } as IdbUtilityMeter]);
    fixture.detectChanges();
    const selection = { baseline: [], selected: [gasGroup.guid], utilities: {
      baseline: component.form()!.controls.sources.getRawValue(), selected: ['Natural Gas'] as const } };
    component.requestMeterGroups(selection); fixture.detectChanges();
    expect(component.form()!.controls.utilityMeterGroupIds.value).toEqual([]);
    expect(component.form()!.controls.sources.getRawValue().map(row => row.energySource)).toEqual(['Electricity']);
    expect(actions.updateSettings).not.toHaveBeenCalled();
    component.cancelReview(); fixture.detectChanges(); component.requestMeterGroups(selection);
    await component.confirmReview(); fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    expect(store.energyUseEquipment()[0].utilityMeterGroupIds).toEqual([gasGroup.guid]);
    expect(store.energyUseEquipment()[0].utilityData.map(row => row.energySource)).toEqual(['Natural Gas']);
    expect(actions.updateSettings).toHaveBeenCalledTimes(1);
  });
  it('copies only saved values and deletes the confirmed item before returning to its inventory', async () => {
    const { fixture, component, actions, navigation } = setup();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.form()!.controls.name.setValue('Pending'); fixture.detectChanges(); await component.copy(); expect(actions.copy).not.toHaveBeenCalled();
    component.editor.discard(); fixture.detectChanges(); await component.copy(); expect(actions.copy).toHaveBeenCalledTimes(1);
    component.requestDelete(); await component.confirmReview();
    expect(actions.delete).toHaveBeenCalledTimes(1); expect(navigation.openFacilityInventory).toHaveBeenCalledWith('facility-a', 'energy-uses');
  });
});
