import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { PredictorWorkspaceActionsService } from '../predictor-workspace-actions.service';
import { CreatePredictorDrawerComponent } from './create-predictor-drawer.component';

describe('Predictor creation selections', () => {
  function setup(initialFacilityGuid?: string, singleFacility = false) {
    const account = signal({ guid: 'account' });
    const facilities = signal([{ guid: 'f1', accountId: 'account', name: 'One' }, { guid: 'f2', accountId: 'account', name: 'Two' }]);
    const canWrite = signal(true), hasPending = signal(false);
    const actions = { createPredictor: vi.fn().mockResolvedValue({ guid: 'created', accountId: 'account', facilityId: 'f2' }) };
    TestBed.configureTestingModule({ imports: [CreatePredictorDrawerComponent], providers: [
      { provide: AccountWorkspaceStore, useValue: { account, facilities, canWrite, hasPending } }
    ] }).overrideComponent(CreatePredictorDrawerComponent, { set: { providers: [{ provide: PredictorWorkspaceActionsService, useValue: actions }] } });
    const fixture = TestBed.createComponent(CreatePredictorDrawerComponent);
    fixture.componentRef.setInput('singleFacility', singleFacility);
    if (initialFacilityGuid) fixture.componentRef.setInput('initialFacilityGuid', initialFacilityGuid);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const choose = (name: string) => {
      fixture.detectChanges();
      const buttons = [...fixture.nativeElement.querySelectorAll('.creation-choice')] as HTMLButtonElement[];
      buttons.find(button => button.querySelector('strong')?.textContent === name)!.click(); fixture.detectChanges();
    };
    const ready = () => {
      if (!initialFacilityGuid) choose('Two');
      choose('Standard predictor'); component.form.controls.name.setValue('Production'); fixture.detectChanges();
    };
    return { fixture, component, account, facilities, canWrite, hasPending, actions, choose, ready };
  }

  it('requires facility, type and a valid name before creating a standard predictor', async () => {
    const { fixture, component, actions, choose } = setup();
    expect(component.step()).toBe('facility'); expect(component.canCreate()).toBe(false);
    choose('Two'); expect(component.step()).toBe('type');
    choose('Standard predictor'); expect(component.step()).toBe('standard');
    expect(fixture.nativeElement.querySelector('[formControlName="unit"]')).toBeNull();
    for (const name of ['', '   ', 'a'.repeat(101)]) {
      component.form.controls.name.setValue(name); await component.submit();
      expect(actions.createPredictor).not.toHaveBeenCalled();
    }
    component.form.patchValue({ name: 'Production', production: true }); fixture.detectChanges();
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(actions.createPredictor).toHaveBeenCalledExactlyOnceWith({ name: 'Production', production: true, predictorType: 'Standard' }, 'f2');
  });

  it.each([false, true])('skips and locks an explicit facility (single facility: %s)', single => {
    const { fixture, component } = setup('f2', single);
    expect(component.step()).toBe('type'); expect(fixture.nativeElement.querySelector('#predictor-facility-search')).toBeNull();
    expect(fixture.nativeElement.querySelector('.creation-selection').disabled).toBe(true);
    component.selectFacility('f1'); expect(component.facilityGuid()).toBe('f2');
  });

  it('hands off only checked weather types and requires at least one without persisting predictors', async () => {
    const { fixture, component, choose, actions } = setup();
    const weather = vi.fn(); component.weatherSelected.subscribe(weather);
    choose('Two'); choose('Weather predictors');
    expect(component.step()).toBe('weather'); expect(component.includedWeatherTypes()).toEqual(['HDD']);
    component.weatherForm.controls.HDD.setValue(false); fixture.detectChanges();
    expect(component.canCreate()).toBe(false); await component.submit(); expect(weather).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Select at least one weather predictor');
    component.weatherForm.controls.CDD.setValue(true); component.weatherForm.controls.relativeHumidity.setValue(true); fixture.detectChanges();
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit')); await fixture.whenStable();
    expect(weather).toHaveBeenCalledExactlyOnceWith({ facilityGuid: 'f2', weatherDataTypes: ['CDD', 'relativeHumidity'] });
    expect(actions.createPredictor).not.toHaveBeenCalled();
  });

  it('retains independent standard and weather choices when editing earlier steps', () => {
    const { fixture, component, ready, choose } = setup(); ready();
    component.form.controls.production.setValue(true);
    component.editSelection('type'); choose('Weather predictors');
    component.weatherForm.controls.CDD.setValue(true);
    component.editSelection('facility'); choose('One'); choose('Standard predictor');
    expect(component.form.getRawValue()).toEqual({ name: 'Production', production: true });
    component.editSelection('type'); choose('Weather predictors'); fixture.detectChanges();
    expect(component.includedWeatherTypes()).toEqual(['HDD', 'CDD']);
    expect(component.facilityGuid()).toBe('f1');
  });

  it('supports facility search and an empty inventory', () => {
    const { fixture, component, facilities } = setup();
    component.facilitySearch.setValue('missing'); fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('No matching facilities');
    fixture.nativeElement.querySelector('.creation-search-empty button').click(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.creation-choice').length).toBe(2);
    facilities.set([]); fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Add a facility before adding a predictor');
  });

  it('blocks pending, read-only, deleted-facility and stale-account handoffs', async () => {
    const { fixture, component, ready, canWrite, hasPending, facilities, account, actions } = setup(); ready();
    canWrite.set(false); await component.submit(); canWrite.set(true);
    hasPending.set(true); await component.submit(); hasPending.set(false);
    facilities.set([]); fixture.detectChanges(); await component.submit();
    expect(fixture.nativeElement.textContent).toContain('This facility is no longer available');
    facilities.set([{ guid: 'f2', accountId: 'account', name: 'Two' }]); account.set({ guid: 'other' }); await component.submit();
    expect(actions.createPredictor).not.toHaveBeenCalled();
  });

  it('disables repeat submissions and retains the draft after an error for retry', async () => {
    const { fixture, component, ready, actions } = setup(); ready();
    let fail!: (error: Error) => void;
    actions.createPredictor.mockImplementationOnce(() => new Promise((_resolve, reject) => { fail = reject; }));
    const saving = component.submit(); await component.submit(); fixture.detectChanges();
    expect(component.form.disabled).toBe(true); expect(actions.createPredictor).toHaveBeenCalledOnce();
    fail(new Error('Could not save predictor')); await saving; fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Could not save predictor');
    expect(component.form.controls.name.value).toBe('Production'); expect(component.form.enabled).toBe(true);
    await component.submit(); expect(actions.createPredictor).toHaveBeenCalledTimes(2);
  });

  it.each(['destroyed', 'account-switched', 'facility-changed'] as const)('suppresses late creation output after %s', async reason => {
    const { fixture, component, ready, account, actions } = setup(); ready();
    let complete!: (value: any) => void;
    actions.createPredictor.mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
    const created = vi.fn(); component.created.subscribe(created);
    const saving = component.submit();
    if (reason === 'destroyed') fixture.destroy();
    else if (reason === 'account-switched') account.set({ guid: 'other' });
    else component.facilityControl.setValue('f1');
    complete({ guid: 'created', accountId: 'account', facilityId: 'f2' }); await saving;
    expect(created).not.toHaveBeenCalled();
  });
});
