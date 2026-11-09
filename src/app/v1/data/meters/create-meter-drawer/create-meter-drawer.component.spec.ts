import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { account, facility, meter } from '../facility-meters.testing';
import { MeterActionsService } from '../meter-actions.service';
import { CreateMeterDrawerComponent } from './create-meter-drawer.component';

describe('CreateMeterDrawerComponent', () => {
  function setup(initialFacilityGuid?: string, singleFacility = false) {
    const facilities = signal([facility(), facility({ guid: 'facility-b', name: 'Beta', volumeGasUnit: 'SCF' })]);
    const canWrite = signal(true), hasPending = signal(false), activeAccount = signal(account());
    const actions = { createMeter: vi.fn().mockResolvedValue(meter({ guid: 'created', facilityId: 'facility-b' })) };
    TestBed.configureTestingModule({
      declarations: [CreateMeterDrawerComponent],
      imports: [ReactiveFormsModule, WorkspaceSlideoutComponent, IconComponent],
      providers: [{ provide: AccountWorkspaceStore, useValue: { account: activeAccount, facilities, canWrite, hasPending, customFuels: signal([]) } }]
    }).overrideComponent(CreateMeterDrawerComponent, { set: { providers: [{ provide: MeterActionsService, useValue: actions }] } });
    const fixture = TestBed.createComponent(CreateMeterDrawerComponent);
    fixture.componentRef.setInput('singleFacility', singleFacility);
    if (initialFacilityGuid) fixture.componentRef.setInput('initialFacilityGuid', initialFacilityGuid);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const choose = (text: string) => {
      const button = [...fixture.nativeElement.querySelectorAll('.creation-choice')] as HTMLButtonElement[];
      button.find(item => item.textContent?.trim() === text)!.click(); fixture.detectChanges();
    };
    const ready = () => {
      if (!initialFacilityGuid) choose('Beta');
      choose('Electricity');
      component.selectUnit('MWh');
      component.form.controls.name.setValue('Main Electric'); fixture.detectChanges();
    };
    return { fixture, component, choose, ready, actions, facilities, canWrite, hasPending, activeAccount };
  }

  it('advances through facility, source, collection unit and name without group assignment', async () => {
    const { fixture, component, choose, actions } = setup();
    expect(component.step()).toBe('facility');
    expect(fixture.nativeElement.querySelector('[type="submit"]')).toBeNull();
    choose('Beta'); expect(component.step()).toBe('source');
    choose('Natural Gas'); expect(component.step()).toBe('unit');
    expect(fixture.nativeElement.textContent).toContain('Standard Cubic Feet');
    component.selectUnit('CCF'); fixture.detectChanges();
    expect(component.step()).toBe('name');
    expect(fixture.nativeElement.querySelector('select')).toBeNull();
    expect(fixture.nativeElement.querySelector('[formControlName="groupId"]')).toBeNull();
    const submit = fixture.nativeElement.querySelector('[type="submit"]') as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    component.form.controls.name.setValue('   '); fixture.detectChanges();
    expect(submit.disabled).toBe(true);
    component.form.controls.name.setValue('Boiler'); fixture.detectChanges();
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(actions.createMeter).toHaveBeenCalledExactlyOnceWith({ name: 'Boiler', source: 'Natural Gas', startingUnit: 'CCF' }, 'facility-b');
  });

  it.each([false, true])('skips and locks facility selection for an explicit owner (single facility: %s)', single => {
    const { fixture, component } = setup('facility-b', single);
    expect(component.step()).toBe('source');
    expect(fixture.nativeElement.querySelector('#meter-facility-search')).toBeNull();
    const selection = fixture.nativeElement.querySelector('.creation-selection') as HTMLButtonElement;
    expect(selection.textContent).toContain('Beta'); expect(selection.disabled).toBe(true);
    component.selectFacility('facility-a'); expect(component.facilityGuid()).toBe('facility-b');
  });

  it('filters facilities, recovers from empty searches, and clears a unit on a changed source or owner', () => {
    const { fixture, component, ready } = setup();
    component.facilitySearch.setValue('missing'); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No matching facilities');
    (fixture.nativeElement.querySelector('.creation-search-empty button') as HTMLButtonElement).click(); fixture.detectChanges();
    ready();
    component.editSelection('source'); component.selectSource('Natural Gas'); fixture.detectChanges();
    expect(component.form.controls.startingUnit.value).toBe('');
    expect(component.form.controls.name.value).toBe('Main Electric');
    component.selectUnit('SCF'); component.editSelection('facility'); component.selectFacility('facility-a'); fixture.detectChanges();
    expect(component.step()).toBe('source'); expect(component.form.controls.startingUnit.value).toBe('');
    component.selectUnit('gal'); expect(component.step()).toBe('source');
  });

  it('lets an unlocked drawer replace a removed facility without losing its meter draft', async () => {
    const { fixture, component, ready, facilities, choose, actions } = setup(); ready();
    const created = vi.fn(); component.created.subscribe(created);
    actions.createMeter.mockResolvedValue(meter({ guid: 'created', facilityId: 'facility-a' }));
    facilities.set([facility()]); fixture.detectChanges();
    expect(component.canCreate()).toBe(false);
    const selection = fixture.nativeElement.querySelector('[aria-label="Change Facility unavailable"]') as HTMLButtonElement;
    expect(selection).not.toBeNull(); expect(selection.disabled).toBe(false);
    selection.click(); fixture.detectChanges(); expect(component.step()).toBe('facility');
    choose('Facility A'); choose('Electricity'); component.selectUnit('MWh'); fixture.detectChanges();
    expect(component.form.getRawValue()).toEqual({ source: 'Electricity', startingUnit: 'MWh', name: 'Main Electric' });
    await component.createMeter();
    expect(actions.createMeter).toHaveBeenCalledExactlyOnceWith({ name: 'Main Electric', source: 'Electricity', startingUnit: 'MWh' }, 'facility-a');
    expect(created).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ guid: 'created', facilityId: 'facility-a' }));
  });

  it.each([false, true])('keeps a removed explicit facility visible and locked (single facility: %s)', single => {
    const { fixture, component, ready, facilities, actions } = setup('facility-b', single); ready();
    facilities.set([facility()]); fixture.detectChanges();
    const selection = fixture.nativeElement.querySelector('[aria-label="Facility unavailable"]') as HTMLButtonElement;
    expect(selection).not.toBeNull(); expect(selection.disabled).toBe(true);
    selection.click(); component.editSelection('facility'); component.selectFacility('facility-a');
    expect(component.step()).toBe('name'); expect(component.facilityGuid()).toBe('facility-b');
    expect(component.canCreate()).toBe(false); expect(actions.createMeter).not.toHaveBeenCalled();
  });

  it('blocks repeat submissions and emits the successfully created meter', async () => {
    const { fixture, component, ready, actions } = setup(); ready();
    const created = vi.fn(); component.created.subscribe(created);
    let resolve!: (value: ReturnType<typeof meter>) => void;
    actions.createMeter.mockImplementation(() => new Promise(done => { resolve = done; }));
    const saving = component.createMeter(); await component.createMeter(); fixture.detectChanges();
    expect(component.form.controls.name.disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('[type="submit"]').disabled).toBe(true);
    expect(actions.createMeter).toHaveBeenCalledOnce();
    resolve(meter({ guid: 'created', facilityId: 'facility-b' })); await saving;
    expect(created).toHaveBeenCalledWith(expect.objectContaining({ guid: 'created', facilityId: 'facility-b' }));
  });

  it('retains choices and name after a failed save and supports retry', async () => {
    const { fixture, component, ready, actions } = setup(); ready();
    actions.createMeter.mockRejectedValueOnce(new Error('Could not save meter'));
    await component.createMeter(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Could not save meter');
    expect(component.form.getRawValue()).toEqual({ source: 'Electricity', startingUnit: 'MWh', name: 'Main Electric' });
    expect(component.form.controls.name.enabled).toBe(true);
    await component.createMeter(); expect(actions.createMeter).toHaveBeenCalledTimes(2);
  });

  it('prevents saves for deleted facilities, read-only or pending workspaces, and changed accounts', async () => {
    const { fixture, component, ready, facilities, canWrite, hasPending, activeAccount, actions } = setup(); ready();
    facilities.set([facility()]); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('This facility is no longer available');
    await component.createMeter(); facilities.set([facility({ guid: 'facility-b' })]);
    canWrite.set(false); await component.createMeter(); canWrite.set(true);
    hasPending.set(true); await component.createMeter(); hasPending.set(false);
    activeAccount.set(account({ guid: 'account-b' })); await component.createMeter();
    expect(actions.createMeter).not.toHaveBeenCalled();
  });

  it('shows an empty facility state without offering source selection', () => {
    const { fixture, facilities } = setup(); facilities.set([]); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Add a facility before adding a meter');
    expect(fixture.nativeElement.querySelector('.creation-choice')).toBeNull();
  });

  it.each(['destroyed', 'account-switched', 'facility-changed'] as const)('suppresses a completed output after %s', async reason => {
    const { fixture, component, ready, actions, activeAccount } = setup(); ready();
    const created = vi.fn(); component.created.subscribe(created);
    let complete!: (value: ReturnType<typeof meter>) => void;
    actions.createMeter.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
    const saving = component.createMeter();
    if (reason === 'destroyed') fixture.destroy();
    else if (reason === 'account-switched') activeAccount.set(account({ guid: 'account-b' }));
    else component.facilityControl.setValue('facility-a');
    complete(meter({ guid: 'committed', facilityId: 'facility-b' })); await saving;
    expect(created).not.toHaveBeenCalled(); expect(actions.createMeter).toHaveBeenCalledOnce();
  });
});
