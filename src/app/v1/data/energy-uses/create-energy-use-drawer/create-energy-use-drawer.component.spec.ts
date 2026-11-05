import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { EnergyUsesModule } from '../energy-uses.module';
import { EnergyUseActionsService } from '../energy-use-actions.service';
import { energyUseFacility, energyUseGroup, energyUseItem } from '../energy-uses.testing';
import { previousEnergyUseYear } from '../models/energy-use-settings.models';
import { CreateEnergyUseDrawerComponent } from './create-energy-use-drawer.component';

function setup(initialFacility?: string, single = false) {
  const north = { ...energyUseFacility(), fiscalYear: 'calendarYear' as const, energyUnit: 'kWh' };
  const south = { ...north, guid: 'facility-b', name: 'South plant' };
  const store = { account: signal({ guid: 'account-a', portfolioFacilityOrder: ['facility-b', 'facility-a'] }), canWrite: signal(true), hasPending: signal(false),
    facilities: signal(single ? [north] : [north, south, { ...north, guid: 'foreign-facility', accountId: 'account-b', name: 'Foreign' }]),
    energyUseGroups: signal([energyUseGroup(), energyUseGroup({ guid: 'group-b', facilityId: 'facility-b', name: 'Boilers' }), energyUseGroup({ guid: 'foreign-group', accountId: 'account-b', name: 'Foreign group' })]) };
  const actions = { create: vi.fn<EnergyUseActionsService['create']>(async () => energyUseItem()) };
  TestBed.configureTestingModule({ imports: [EnergyUsesModule], providers: [{ provide: AccountWorkspaceStore, useValue: store }, { provide: EnergyUseActionsService, useValue: actions }] });
  const fixture = TestBed.createComponent(CreateEnergyUseDrawerComponent);
  if (initialFacility) fixture.componentRef.setInput('initialFacilityGuid', initialFacility);
  fixture.componentRef.setInput('singleFacility', single); fixture.detectChanges(); fixture.detectChanges();
  const component = fixture.componentInstance, root = fixture.nativeElement as HTMLElement;
  const choose = (name: string) => {
    const button = [...root.querySelectorAll<HTMLButtonElement>('.creation-choice')].find(button => button.textContent?.trim() === name)!;
    expect(button).toBeTruthy(); button.click(); fixture.detectChanges();
  };
  return { fixture, component, store, actions, root, north, south, choose };
}

describe('progressive Energy Use creation', () => {
  it('starts with owned facility choices in portfolio order and reveals only the next choice', async () => {
    const { component, root, choose, actions, fixture } = setup();
    expect(component.step()).toBe('facility'); expect(component.dirty()).toBe(false);
    expect([...root.querySelectorAll('.creation-choice strong')].map(element => element.textContent)).toEqual(['South plant', 'North plant']);
    expect(root.querySelector('#energy-use-name')).toBeNull(); expect(root.querySelector('app-energy-use-settings-fields')).toBeNull();
    component.facilitySearch.setValue('north'); fixture.detectChanges();
    expect(root.querySelectorAll('.creation-choice')).toHaveLength(1); expect(component.dirty()).toBe(false);
    await component.submit(); expect(actions.create).not.toHaveBeenCalled();
    choose('North plant');
    expect(component.step()).toBe('group'); expect(root.querySelector('#energy-use-name')).toBeNull();
    expect([...root.querySelectorAll('.creation-choice strong')].map(element => element.textContent)).toEqual(['Production', 'Create energy-use group']);
    expect(root.textContent).not.toContain('Initial year'); expect(root.textContent).not.toContain('Rated capacity');
  });

  it('pins named facility context, selects an existing owned group, and creates only after naming', async () => {
    const { component, root, choose, actions, north } = setup('facility-a');
    expect(component.step()).toBe('group'); expect(component.dirty()).toBe(false);
    expect(root.querySelector<HTMLButtonElement>('.creation-selection')!.disabled).toBe(true);
    choose('Production'); expect(component.step()).toBe('name'); expect(component.canCreate()).toBe(false);
    component.form.controls.name.setValue('  '); await component.submit(); expect(actions.create).not.toHaveBeenCalled();
    component.form.controls.name.setValue('Pump'); await component.submit();
    expect(actions.create).toHaveBeenCalledWith({ settings: { name: 'Pump', notes: '', equipmentType: 'Other', sources: [{ energySource: 'Electricity', size: 0, numberOfEquipment: 1, units: 'kW' }], utilityMeterGroupIds: [] },
      initialYear: previousEnergyUseYear(north), group: { kind: 'existing', guid: 'group-a' } }, 'account-a', 'facility-a', expect.objectContaining({ item: expect.objectContaining({ guid: expect.any(String) }) }));
    expect(component.dirty()).toBe(false);
  });

  it('uses implicit single-facility ownership without offering another facility step', () => {
    const { component, root } = setup(undefined, true);
    expect(component.step()).toBe('group'); expect(component.form.controls.facilityGuid.value).toBe('facility-a');
    expect(root.querySelector('#energy-use-facility-search')).toBeNull();
    component.editSelection('facility'); expect(component.step()).toBe('group');
  });

  it('collects only a new group name before the item name and submits them atomically', async () => {
    const { component, choose, root, actions, fixture } = setup('facility-a');
    choose('Create energy-use group'); expect(component.step()).toBe('new-group');
    expect(root.querySelector('#energy-use-name')).toBeNull();
    component.form.controls.groupName.setValue('  '); await component.submit(); expect(component.step()).toBe('new-group');
    component.form.controls.groupName.setValue(' New group '); await component.submit(); fixture.detectChanges();
    expect(component.step()).toBe('name'); expect(actions.create).not.toHaveBeenCalled();
    expect(root.querySelector('.creation-selections')!.textContent).toContain('New group');
    component.form.controls.name.setValue('New burner'); await component.submit();
    expect(actions.create).toHaveBeenCalledTimes(1);
    expect(actions.create.mock.calls[0]).toEqual([expect.objectContaining({ settings: expect.objectContaining({ name: 'New burner' }), group: { kind: 'new', name: 'New group' } }), 'account-a', 'facility-a', expect.any(Object)]);
  });

  it('clears group ownership when changing facility while retaining the item name', () => {
    const { component, choose, fixture } = setup(); choose('North plant'); choose('Production');
    component.form.controls.name.setValue('Edited name'); component.editSelection('facility'); fixture.detectChanges(); choose('South plant');
    expect(component.form.controls.groupKind.value).toBeNull(); expect(component.form.controls.groupGuid.value).toBe('');
    component.selectGroup('group-a'); expect(component.step()).toBe('group');
    choose('Boilers'); expect(component.step()).toBe('name'); expect(component.form.controls.name.value).toBe('Edited name');
  });

  it('blocks removed groups and allows recovery through pinned selections', async () => {
    const { component, choose, store, actions, fixture } = setup('facility-a'); choose('Production'); component.form.controls.name.setValue('Pump');
    store.energyUseGroups.set(store.energyUseGroups().filter(group => group.guid !== 'group-a')); fixture.detectChanges();
    expect(component.canCreate()).toBe(false); expect(component.availabilityError()).toContain('no longer available');
    await component.submit(); expect(actions.create).not.toHaveBeenCalled();
    component.editSelection('group'); fixture.detectChanges(); choose('Create energy-use group'); component.form.controls.groupName.setValue('Replacement'); component.useNewGroup();
    expect(component.canCreate()).toBe(true);
  });

  it('retains the chosen group, item name, and request identity after a failed creation', async () => {
    const { component, choose, actions, fixture } = setup('facility-a'); choose('Create energy-use group');
    component.form.controls.groupName.setValue('Production'); component.useNewGroup(); component.form.controls.name.setValue('Pump');
    actions.create.mockRejectedValueOnce(new Error('Write failed')); await component.submit(); fixture.detectChanges();
    expect(component.error()).toBe('Write failed'); expect(component.dirty()).toBe(true); expect(component.canCreate()).toBe(true);
    const submitted = actions.create.mock.calls[0]; await component.submit();
    expect(actions.create.mock.calls[1]).toEqual(submitted); expect(component.form.controls.name.value).toBe('Pump');
  });

  it('protects dirty dismissal and blocks changes and duplicate writes while creating', async () => {
    const { component, choose, actions, fixture } = setup('facility-a'), closed = vi.fn(); component.closed.subscribe(closed);
    component.requestClose(); expect(closed).toHaveBeenCalledTimes(1); closed.mockClear();
    choose('Production'); component.form.controls.name.setValue('Pump'); component.requestClose(); fixture.detectChanges();
    expect(component.discardOpen()).toBe(true); expect(closed).not.toHaveBeenCalled();
    component.discardOpen.set(false);
    let complete!: (value: ReturnType<typeof energyUseItem>) => void;
    actions.create.mockImplementationOnce(() => new Promise(resolve => complete = resolve));
    const pending = component.submit(); fixture.detectChanges();
    component.editSelection('group'); component.startNewGroup(); component.requestClose(); await component.submit();
    expect(actions.create).toHaveBeenCalledTimes(1); expect(component.step()).toBe('name'); expect(closed).not.toHaveBeenCalled();
    complete(energyUseItem()); await pending;
  });
});
