import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { PredictorWorkspaceActionsService } from '@app/v1/facility/data/predictors/predictor-workspace-actions.service';
import { CreatePredictorDrawerComponent } from './create-predictor-drawer.component';

describe('account Predictor creation', () => {
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
    component.facilityControl.setValue('f2'); fixture.detectChanges(); component.openWeather(); expect(weather).toHaveBeenCalledWith('f2');
    const draft = { name: 'Production', unit: 'tons', production: true, predictorType: 'Standard' as const };
    await component.create(draft); expect(actions.createPredictor).toHaveBeenCalledWith(draft, 'f2'); expect(created).toHaveBeenCalled();
    facilities.set(facilities().slice(0, 1)); fixture.detectChanges(); expect(component.canCreate()).toBe(false);
  });
});
