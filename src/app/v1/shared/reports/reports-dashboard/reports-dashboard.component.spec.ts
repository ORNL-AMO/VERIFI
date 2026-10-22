import { TestBed } from '@angular/core/testing';
import { setupReportInventory } from '../testing/report-inventory-test-setup';
import { ReportsDashboardComponent } from './reports-dashboard.component';

describe('report browse state', () => {
  it('restores the facility report default after discarding and reopening an account draft', async () => {
    const { facilityActions } = await setupReportInventory();
    const fixture = TestBed.createComponent(ReportsDashboardComponent); fixture.detectChanges();
    const lifecycle = fixture.componentInstance.lifecycle;
    lifecycle.openCreate();
    lifecycle.form.controls.scope.setValue('facility');
    lifecycle.form.controls.facilityGuid.setValue('facility-a');
    lifecycle.form.controls.type.setValue('overview');
    lifecycle.requestClose();
    expect(lifecycle.confirmation()).toBe('discard');
    lifecycle.discardEditor();

    lifecycle.openCreate();
    expect(lifecycle.form.controls.type.value).toBe('betterPlants');
    lifecycle.form.controls.scope.setValue('facility');
    lifecycle.form.controls.facilityGuid.setValue('facility-a');
    expect(lifecycle.form.controls.type.value).toBe('analysis');
    expect(lifecycle.canSave()).toBe(true);
    await lifecycle.submit();
    expect(facilityActions.create).toHaveBeenCalledWith('facility-a', 'New Report', 'analysis');
  });

  it('restores account controls and overrides independently of facility and Analysis preferences', async () => {
    const { state, accountActions, facilityActions } = await setupReportInventory();
    const first = TestBed.createComponent(ReportsDashboardComponent); first.detectChanges();
    const key = first.componentInstance.entries()[0].key;
    first.componentInstance.filtersForm.controls.search.setValue('saved');
    first.componentInstance.inventory.detailControl.setValue('summary');
    first.componentInstance.inventory.setTileDetail({ guid: key, level: 'detailed' }); first.detectChanges(); first.destroy();
    const returned = TestBed.createComponent(ReportsDashboardComponent); returned.detectChanges();
    expect(returned.componentInstance.filtersForm.controls.search.value).toBe('saved');
    expect(returned.componentInstance.inventory.detail()).toBe('summary');
    expect(returned.componentInstance.inventory.overrides()[key]).toBe('detailed'); returned.destroy();
    state.set({ facilityGuid: 'facility-a' });
    const facility = TestBed.createComponent(ReportsDashboardComponent); facility.componentRef.setInput('scope', 'facility'); facility.detectChanges();
    expect(facility.componentInstance.filtersForm.controls.search.value).toBe('');
    expect(facility.componentInstance.inventory.detail()).toBe('simple'); expect(facility.componentInstance.inventory.overrides()).toEqual({});
    expect(accountActions.updateName).not.toHaveBeenCalled(); expect(facilityActions.updateName).not.toHaveBeenCalled();
  });
  it('drops a remembered impact filter when Other Impacts is disabled without deleting saved reports', async () => {
    const { store } = await setupReportInventory();
    const saved = { ...store.snapshot()!, accountReports: [{ ...store.accountReports()[0], reportType: 'accountEmissionFactors' as const }] };
    store.publish(saved);
    const fixture = TestBed.createComponent(ReportsDashboardComponent); fixture.detectChanges();
    fixture.componentInstance.filtersForm.controls.type.setValue('account:accountEmissionFactors'); fixture.detectChanges();
    expect(fixture.componentInstance.filteredEntries()).toHaveLength(1);
    store.publish({ ...saved, account: { ...saved.account, displayEmissions: false } }); fixture.detectChanges();
    expect(fixture.componentInstance.filtersForm.controls.type.value).toBe('all'); expect(store.accountReports()).toHaveLength(1);
    expect(fixture.componentInstance.entries().every(entry => entry.scope === 'facility')).toBe(true);
  });
});
