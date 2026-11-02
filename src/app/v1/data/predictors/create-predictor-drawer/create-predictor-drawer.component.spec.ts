import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { PredictorWorkspaceActionsService } from '../predictor-workspace-actions.service';
import { CreatePredictorDrawerComponent } from './create-predictor-drawer.component';

describe('account Predictor creation', () => {
  function deferredCreation() {
    const account = signal({ guid: 'account' });
    const facilities = signal([{ guid: 'f1', accountId: 'account', name: 'One' }, { guid: 'f2', accountId: 'account', name: 'Two' }]);
    let complete!: (value: any) => void, fail!: (error: Error) => void;
    const actions = { createPredictor: vi.fn(() => new Promise((resolve, reject) => { complete = resolve; fail = reject; })) };
    TestBed.configureTestingModule({ imports: [CreatePredictorDrawerComponent], providers: [
      { provide: AccountWorkspaceStore, useValue: { account, facilities, canWrite: signal(true), hasPending: signal(false) } }
    ] }).overrideComponent(CreatePredictorDrawerComponent, { set: { providers: [{ provide: PredictorWorkspaceActionsService, useValue: actions }] } });
    const fixture = TestBed.createComponent(CreatePredictorDrawerComponent); fixture.detectChanges();
    const component = fixture.componentInstance;
    component.facilityControl.setValue('f2');
    const created = vi.fn(); component.created.subscribe(created);
    const saving = component.create({ name: 'Production', unit: 'tons', production: true, predictorType: 'Standard' });
    return { fixture, component, account, created, saving,
      complete: () => complete({ guid: 'committed', accountId: 'account', facilityId: 'f2' }), fail: () => fail(new Error('Late failure')) };
  }

  it.each(['destroyed', 'account-switched', 'facility-changed'] as const)('suppresses a committed Predictor result when its drawer is %s', async reason => {
    const view = deferredCreation();
    if (reason === 'destroyed') view.fixture.destroy();
    else if (reason === 'account-switched') view.account.set({ guid: 'other-account' });
    else view.component.facilityControl.setValue('f1');
    view.complete(); await view.saving;
    expect(view.created).not.toHaveBeenCalled();
  });

  it('suppresses a late Predictor error after its owning account changes', async () => {
    const view = deferredCreation();
    view.account.set({ guid: 'other-account' }); view.fail(); await view.saving;
    expect(view.component.error()).toBe('');
  });

  it('requires an owned facility before either creation path and ignores deleted facilities', async () => {
    const facilities = signal([{ guid: 'f1', accountId: 'account', name: 'One' }, { guid: 'f2', accountId: 'account', name: 'Two' }]);
    const actions = { createPredictor: vi.fn(async () => ({ guid: 'new', accountId: 'account', facilityId: 'f2' })) };
    TestBed.configureTestingModule({ imports: [CreatePredictorDrawerComponent], providers: [
      { provide: AccountWorkspaceStore, useValue: { account: signal({ guid: 'account' }), facilities, canWrite: signal(true), hasPending: signal(false) } }
    ] });
    TestBed.overrideComponent(CreatePredictorDrawerComponent, { set: { providers: [{ provide: PredictorWorkspaceActionsService, useValue: actions }] } });
    const fixture = TestBed.createComponent(CreatePredictorDrawerComponent); fixture.detectChanges();
    const component = fixture.componentInstance, weather = vi.fn(), created = vi.fn();
    component.weatherSelected.subscribe(weather); component.created.subscribe(created);
    component.openWeather(); expect(weather).not.toHaveBeenCalled(); expect(component.canCreate()).toBe(false);
    expect(component.facilityControl.value).toBe('');
    fixture.componentRef.setInput('singleFacility', true);
    fixture.componentRef.setInput('initialFacilityGuid', 'f2'); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[predictorContext] select')).toBeNull();
    expect(component.facilityControl.value).toBe('f2'); component.openWeather(); expect(weather).toHaveBeenCalledWith('f2');
    const draft = { name: 'Production', unit: 'tons', production: true, predictorType: 'Standard' as const };
    await component.create(draft); expect(actions.createPredictor).toHaveBeenCalledWith(draft, 'f2'); expect(created).toHaveBeenCalled();
    facilities.set(facilities().slice(0, 1)); fixture.detectChanges(); expect(component.canCreate()).toBe(false);
  });
});
