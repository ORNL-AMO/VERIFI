import { TestBed } from '@angular/core/testing';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import { EnergyUseActionsService } from '../../energy-use-actions.service';
import { EnergyUsesModule } from '../../energy-uses.module';
import { energyUseGroup, energyUseItem, energyUsesSnapshot } from '../../energy-uses.testing';
import { TransferEnergyUseComponent } from './transfer-energy-use.component';

describe('Transfer and copy energy use slideout', () => {
  function setup(bulk = false) {
    const item = energyUseItem(), target = energyUseGroup({ guid: 'destination', name: 'Destination' });
    const items = bulk ? [item, energyUseItem({ guid: 'second' })] : [item];
    const store = new AccountWorkspaceStore();
    store.publish({ ...energyUsesSnapshot(items), energyUseGroups: [energyUseGroup(), target, energyUseGroup({ guid: 'other-facility', facilityId: 'facility-b' })] });
    const actions = { transferItems: vi.fn<EnergyUseActionsService['transferItems']>(async request => ({ mode: request.mode, group: request.destinationGroup.group,
      items: request.sources.map((row, index) => ({ ...row.item, ...(request.mode === 'copy' ? request.copyIdentities[index] : {}), facilityId: request.destinationFacility.guid, energyUseGroupId: request.destinationGroup.group.guid })) })), recoverPublication: vi.fn(async () => {}) };
    TestBed.configureTestingModule({ imports: [EnergyUsesModule], providers: [{ provide: AccountWorkspaceStore, useValue: store }, { provide: EnergyUseActionsService, useValue: actions }] });
    const fixture = TestBed.createComponent(TransferEnergyUseComponent), component = fixture.componentInstance;
    fixture.componentRef.setInput('items', items); fixture.componentRef.setInput('canAct', true); fixture.detectChanges();
    return { fixture, component, controller: component.controller, store, actions, item, items, target };
  }
  it('defaults to moving within the current facility, allows same-group copies, and resets the destination on facility changes', () => {
    const { component, controller, target } = setup();
    component.open();
    expect(controller.facility()?.guid).toBe('facility-a'); expect(controller.copying()).toBe(false);
    expect(controller.step()).toBe('group'); expect(controller.groups().map(group => group.guid)).toEqual(['destination', 'group-a']);
    controller.chooseGroup(target); expect(controller.canConfirm()).toBe(true);
    controller.form.controls.asCopy.setValue(true);
    expect(controller.groups().map(group => group.guid)).toContain('group-a');
    controller.chooseGroup(controller.groups().find(group => group.guid === 'group-a')!);
    expect(controller.canConfirm()).toBe(true);
    controller.form.controls.asCopy.setValue(false);  expect(controller.canConfirm()).toBe(false);
    controller.chooseFacility('facility-b');
    expect(controller.form.controls.group.value).toBeNull(); expect(controller.crossFacility()).toBe(true);
    expect(controller.groups().map(group => group.guid)).toEqual(['other-facility']);
    controller.chooseNewGroup(); expect(controller.canConfirm()).toBe(false);
    controller.form.controls.groupName.setValue('  New group  ');
    expect(controller.canConfirm()).toBe(false); controller.reviewDestination(); expect(controller.canConfirm()).toBe(true);
  });
  it('keeps step navigation reversible and requires final review before submitting a named group', async () => {
    const { component, controller, actions } = setup(); component.open();
    controller.editSelection('facility'); expect(controller.step()).toBe('facility');
    controller.facilitySearch.setValue('South'); expect(controller.matchingFacilities().map(row => row.guid)).toEqual(['facility-b']);
    controller.chooseFacility('facility-b'); expect(controller.step()).toBe('group');
    controller.chooseNewGroup(); expect(controller.step()).toBe('new-group');
    controller.form.controls.groupName.setValue('  '); controller.reviewDestination();
    expect(controller.step()).toBe('new-group'); await component.confirm(); expect(actions.transferItems).not.toHaveBeenCalled();
    controller.form.controls.groupName.setValue('New destination'); controller.reviewDestination();
    expect(controller.step()).toBe('review'); expect(controller.canConfirm()).toBe(true);
    controller.form.controls.asCopy.setValue(true); controller.back();
    expect(controller.step()).toBe('new-group'); expect(controller.form.controls.groupName.value).toBe('New destination');
    expect(controller.copying()).toBe(true); await component.confirm(); expect(actions.transferItems).not.toHaveBeenCalled();
    controller.reviewDestination(); await component.confirm(); expect(actions.transferItems).toHaveBeenCalledTimes(1);
    expect(actions.transferItems.mock.calls[0][0]).toMatchObject({ mode: 'copy', destinationGroup: { kind: 'new', group: { name: 'New destination' } } });
  });
  it('blocks a stale review and emits all saved items from one command', async () => {
    const { fixture, component, controller, actions, items, target, store } = setup(true);
    component.open(); controller.chooseGroup(target);
    store.publish({ ...store.snapshot()!, energyUseGroups: store.energyUseGroups().map(group => group.guid === target.guid ? { ...group, name: 'Changed' } : group) });
    expect(controller.stale()).toBe(true); await component.confirm(); expect(actions.transferItems).not.toHaveBeenCalled();
    component.close(); component.open(); fixture.detectChanges(); controller.chooseGroup(controller.groups()[0]);
    const completed = vi.fn(); component.completed.subscribe(completed);
    await component.confirm();
    expect(actions.transferItems).toHaveBeenCalledTimes(1);
    expect(actions.transferItems.mock.calls[0][0].sources.map(row => row.item.guid)).toEqual(items.map(row => row.guid));
    expect(completed).toHaveBeenCalledWith(expect.objectContaining({ mode: 'move', items: expect.arrayContaining(items.map(item => expect.objectContaining({ guid: item.guid, energyUseGroupId: target.guid }))) }));
    expect(component.blocked()).toBe(false);
  });
  it('retains stable copy/new-group identities across rejected retries and reviews calendar differences', async () => {
    const { component, controller, actions, store } = setup();
    store.publish({ ...store.snapshot()!, facilities: store.facilities().map(row => ({ ...row, fiscalYear: row.guid === 'facility-a' ? 'calendarYear' : 'nonCalendarYear', fiscalYearMonth: 6, fiscalYearCalendarEnd: true })) });
    component.open(); controller.chooseFacility('facility-b');
    controller.chooseNewGroup(); controller.form.controls.groupName.setValue('New group'); controller.form.controls.asCopy.setValue(true); controller.reviewDestination();
    expect(controller.calendarChanged()).toBe(true);
    actions.transferItems.mockRejectedValueOnce(new Error('Rejected write')); await component.confirm();
    expect(controller.error()).toBe('Rejected write'); expect(controller.canConfirm()).toBe(true);
    await component.confirm();
    expect(actions.transferItems.mock.calls[1][0]).toEqual(actions.transferItems.mock.calls[0][0]);
  });
  it('keeps committed cross-facility copy recovery protected and never repeats persistence', async () => {
    const { component, controller, actions, store } = setup(true);
    component.open(); controller.chooseFacility('facility-b');
    controller.form.controls.asCopy.setValue(true); controller.chooseGroup(controller.groups()[0]);
    actions.transferItems.mockRejectedValueOnce(new WorkspaceWriteError('persistence-failed', 'Refresh failed', undefined, true));
    await component.confirm(); expect(controller.committed()).toBe(true);
    component.close(); await component.confirm(); expect(controller.review()).toBeDefined();
    actions.recoverPublication.mockImplementationOnce(async () => {
      const request = actions.transferItems.mock.calls[0][0];
      store.publish({ ...store.snapshot()!, energyUseEquipment: [...store.energyUseEquipment(), ...request.sources.map((row, i) => ({ ...row.item, ...request.copyIdentities[i], facilityId: request.destinationFacility.guid, energyUseGroupId: request.destinationGroup.group.guid }))] });
    });
    await component.recover(); expect(component.blocked()).toBe(false);
    expect(controller.result()?.items).toHaveLength(2);
    expect(actions.transferItems).toHaveBeenCalledTimes(1); expect(actions.recoverPublication).toHaveBeenCalledWith('account-a');
  });
  it.each(['item', 'source facility', 'destination facility'] as const)('blocks confirmation when the %s changes', field => {
    const { component, controller, store, target } = setup(); component.open(); controller.chooseGroup(target);
    if (field === 'item') store.publish({ ...store.snapshot()!, energyUseEquipment: store.energyUseEquipment().map(row => ({ ...row, notes: 'Changed' })) });
    else store.publish({ ...store.snapshot()!, facilities: store.facilities().map(row => row.guid === 'facility-a' ? { ...row, name: 'Changed' } : row) });
    expect(controller.canConfirm()).toBe(false);
  });
});
