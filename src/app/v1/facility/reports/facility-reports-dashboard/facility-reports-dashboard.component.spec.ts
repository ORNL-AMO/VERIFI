import { TestBed } from '@angular/core/testing';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { ReportsDashboardComponent } from '@app/v1/shared/reports/reports-dashboard/reports-dashboard.component';
import { setupReportInventory } from '@app/v1/shared/reports/testing/report-inventory-test-setup';
import { reportFixture } from '../testing/report-test-fixtures';

describe('facility report inventory', () => {
  async function setup() {
    const context = await setupReportInventory('facility');
    const fixture = TestBed.createComponent(ReportsDashboardComponent);
    fixture.componentRef.setInput('scope', 'facility'); fixture.detectChanges();
    return { ...context, fixture, component: fixture.componentInstance, lifecycle: fixture.componentInstance.lifecycle };
  }
  it('uses shared cards, facility-only filtering, breadcrumbs and explicit empty states', async () => {
    const { fixture, component } = await setup();
    expect(component.entries()).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('Saved report');
    expect(fixture.nativeElement.textContent).not.toContain('Account saved report');
    expect(fixture.nativeElement.querySelector('h1').textContent.trim()).toBe('Reports');
    expect(component.breadcrumbs().map(crumb => crumb.label)).toEqual(['Account A', 'Facility A']);
    expect(fixture.nativeElement.querySelector('app-page-identity a').getAttribute('href')).toContain('/account/account-a/reports/dashboard');
    expect(component.menuActions().map(action => action.id)).toEqual(['rename', 'copy', 'delete']);
    expect(component.filtersForm.controls.sort.value).toBe('attention');
    component.filtersForm.controls.search.setValue('no match'); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No reports match these filters');
  });
  it('keeps actions available after status failure and blocks pending workspace writes', async () => {
    const { fixture, component, status, store } = await setup();
    status.set('error'); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Setup status is unavailable'); expect(component.canAct()).toBe(true);
    store.setPending({ id: 1, label: 'Other change' }); fixture.detectChanges();
    component.openCreate(); expect(component.lifecycle.editor()).toBeUndefined();
  });
  it('retains failed drafts, blocks duplicate submissions, and opens the owned report after creation', async () => {
    const { component, lifecycle, facilityActions, navigate } = await setup();
    facilityActions.create.mockRejectedValueOnce(new Error('Disk full'));
    component.openCreate(); lifecycle.form.controls.name.setValue('Annual report');
    await lifecycle.submit(); expect(lifecycle.editor()).toBeDefined(); expect(lifecycle.error()).toBe('Disk full'); expect(navigate).not.toHaveBeenCalled();
    await lifecycle.submit(); expect(lifecycle.editor()).toBeUndefined();
    expect(facilityActions.create).toHaveBeenLastCalledWith('facility-a', 'Annual report', 'analysis');
    expect(navigate).toHaveBeenCalledWith(['/v1', 'workspace', 'facility', 'facility-a', 'reports', 'workbench', 'created-facility', 'setup']);
  });
  it('protects dirty drafts and unload, and cleans up protection on destruction', async () => {
    const { fixture, component, lifecycle } = await setup();
    const unload = () => { const event = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(event); return event.defaultPrevented; };
    component.openCreate(); expect(unload()).toBe(false);
    lifecycle.form.controls.name.setValue(' '); expect(lifecycle.canSave()).toBe(false);
    expect(unload()).toBe(true); expect(component.isNavigationBlocked()).toBe(true);
    expect(TestBed.inject(UnsavedChangesService).confirmDiscard()).toBe(false);
    lifecycle.requestClose(); fixture.detectChanges(); expect(TestBed.inject(ModalPortalService).activePortal()).not.toBeNull();
    lifecycle.discardEditor(); fixture.detectChanges(); expect(component.hasUnsavedChanges()).toBe(false);
    component.openCreate(); lifecycle.form.controls.name.setValue('Changed'); fixture.destroy(); expect(unload()).toBe(false);
  });
  it('retains failed deletions for retry in a portal confirmation', async () => {
    const { fixture, component, lifecycle, facilityActions } = await setup();
    component.requestAction({ guid: component.entries()[0].key, action: 'delete' }); fixture.detectChanges();
    expect(TestBed.inject(ModalPortalService).activePortal()).not.toBeNull();
    facilityActions.delete.mockRejectedValueOnce(new Error('Could not delete')); await lifecycle.confirmDelete();
    expect(lifecycle.deleteCandidate()).toBeDefined(); expect(lifecycle.error()).toBe('Could not delete');
    await lifecycle.confirmDelete(); fixture.detectChanges(); expect(TestBed.inject(ModalPortalService).activePortal()).toBeNull();
  });
  it('suppresses duplicate submissions and late navigation after a context change', async () => {
    const { fixture, component, lifecycle, facilityActions, state, navigate } = await setup();
    let resolve!: (report: ReturnType<typeof reportFixture>) => void;
    facilityActions.create.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    component.openCreate(); const first = lifecycle.submit(); await lifecycle.submit(); expect(facilityActions.create).toHaveBeenCalledTimes(1);
    state.set({ facilityGuid: 'facility-b' }); fixture.detectChanges(); resolve(reportFixture()); await first;
    expect(navigate).not.toHaveBeenCalled(); expect(lifecycle.editor()).toBeUndefined();
  });
});
