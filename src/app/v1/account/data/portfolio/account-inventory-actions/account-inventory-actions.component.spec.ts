import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { MetersDashboardActionsService } from '@app/v1/facility/data/meters/meters-dashboard/meters-dashboard-actions.service';
import { PredictorWorkspaceActionsService } from '@app/v1/facility/data/predictors/predictor-workspace-actions.service';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { PortfolioFacilityService } from '../portfolio-facility.service';
import { AccountInventoryActionsComponent } from './account-inventory-actions.component';

function setup(resource: 'facilities' | 'meters' | 'predictors' = 'meters') {
  const record = { id: 1, guid: 'item', name: 'Main', accountId: 'a', facilityId: 'f', predictorType: 'Standard' };
  const workspace = { account: signal({ guid: 'a' }), canWrite: signal(true), hasPending: signal(false),
    facilities: signal<any[]>([{ ...record, guid: 'f' }]), meters: signal<any[]>([record]), predictors: signal<any[]>([record, { ...record, guid: 'weather', predictorType: 'Weather' }]),
    meterData: signal<any[]>([{ id: 2, meterId: 'item' }]), predictorData: signal<any[]>([{ id: 3, predictorId: 'item' }]) };
  const meters = { copyMeter: vi.fn().mockResolvedValue(record), deleteMeter: vi.fn().mockResolvedValue(undefined) };
  const preview = { facilityGuid: 'f', predictors: [record], predictorData: [{ id: 3 }], facilityAnalyses: [] };
  const predictors = { copyPredictor: vi.fn().mockResolvedValue(record), previewDeletion: vi.fn().mockReturnValue(preview), deletePredictors: vi.fn().mockResolvedValue(undefined) };
  const facilities = { deleteFacility: vi.fn().mockResolvedValue(undefined) };
  const portal = { show: vi.fn(), hide: vi.fn() };
  TestBed.configureTestingModule({ imports: [AccountInventoryActionsComponent], providers: [
    { provide: AccountWorkspaceStore, useValue: workspace }, { provide: ModalPortalService, useValue: portal }, { provide: PortfolioFacilityService, useValue: facilities }
  ] }).overrideComponent(AccountInventoryActionsComponent, { set: { providers: [
    { provide: MetersDashboardActionsService, useValue: meters }, { provide: PredictorWorkspaceActionsService, useValue: predictors }
  ] } });
  const fixture = TestBed.createComponent(AccountInventoryActionsComponent); fixture.componentRef.setInput('resource', resource); fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, workspace, meters, predictors, facilities, portal, preview };
}

describe('account inventory card actions', () => {
  it('reviews meter reading deletion and preserves the confirmation after failure for retry', async () => {
    const { component, meters, portal } = setup(); component.request({ guid: 'item', action: 'delete' });
    expect(component.pending()?.readingCount).toBe(1); expect(portal.show).toHaveBeenCalled();
    meters.deleteMeter.mockRejectedValueOnce(new Error('Save failed')); await component.confirm();
    expect(component.error()).toBe('Save failed'); expect(component.pending()).toBeDefined();
    await component.confirm(); expect(meters.deleteMeter).toHaveBeenCalledTimes(2); expect(component.pending()).toBeUndefined();
  });
  it('copies in the owning facility without selecting a facility and rejects stale confirmations', async () => {
    const { component, meters, workspace } = setup(); component.request({ guid: 'item', action: 'copy' }); await component.confirm();
    expect(meters.copyMeter).toHaveBeenCalledWith(expect.objectContaining({ facilityId: 'f' }));
    component.request({ guid: 'item', action: 'delete' }); workspace.meterData.set([]); await component.confirm();
    expect(component.error()).toContain('changed'); expect(meters.deleteMeter).not.toHaveBeenCalled();
  });
  it('uses the reviewed predictor contract and hides copying for weather predictors', async () => {
    const { component, predictors, preview, workspace } = setup('predictors');
    workspace.predictors.update(current => [...current, { ...current[0], guid: 'unsupported', predictorType: 'Other' }]);
    expect(component.actionsByGuid()['unsupported']).toEqual([]);
    expect(component.actionsByGuid()['weather'].map(action => action.id)).toEqual(['delete']);
    expect(component.actionsByGuid()['item'].map(action => action.id)).toEqual(['copy', 'delete']);
    component.request({ guid: 'item', action: 'delete' });
    expect(predictors.previewDeletion).toHaveBeenCalledWith(['item'], 'f'); await component.confirm();
    expect(predictors.deletePredictors).toHaveBeenCalledWith(preview, 'f');
    component.request({ guid: 'item', action: 'copy' }); await component.confirm();
    expect(predictors.copyPredictor).toHaveBeenCalledWith(expect.objectContaining({ guid: 'item' }), 'f');
  });
  it('only offers deletion for facilities and cancels on account changes', async () => {
    const { fixture, component, workspace, facilities } = setup('facilities');
    expect(component.actions().map(action => action.id)).toEqual(['delete']);
    component.request({ guid: 'f', action: 'delete' }); workspace.account.set({ guid: 'b' }); fixture.detectChanges();
    expect(component.pending()).toBeUndefined(); await component.confirm(); expect(facilities.deleteFacility).not.toHaveBeenCalled();
  });
});
