import { TestBed } from '@angular/core/testing';
import { setupReportInventory } from '@app/v1/shared/reports/testing/report-inventory-test-setup';
import { AccountReportsLandingComponent } from './account-reports-landing.component';

describe('AccountReportsLandingComponent', () => {
  it('opens saved settings without writes, exposes rename, and keeps report content pending', async () => {
    const context = await setupReportInventory(); context.state.set({ accountGuid: 'account-a', reportGuid: 'account-report' });
    const fixture = TestBed.createComponent(AccountReportsLandingComponent); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Account saved report');
    expect(fixture.nativeElement.textContent).toContain('2024'); expect(fixture.nativeElement.textContent).toContain('Report content pending');
    expect(context.accountActions.create).not.toHaveBeenCalled(); expect(context.accountActions.updateName).not.toHaveBeenCalled();
    fixture.nativeElement.querySelector('header button').click(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#report-type')).toBeNull();
    fixture.componentInstance.lifecycle.form.controls.name.setValue('Renamed'); await fixture.componentInstance.lifecycle.submit();
    expect(context.accountActions.updateName).toHaveBeenCalledWith('account-report', 'Renamed');
  });
  it('shows unavailable for missing and wrong-account reports without recreating records', async () => {
    const { state, accountActions } = await setupReportInventory(); state.set({ accountGuid: 'account-a', reportGuid: 'missing' });
    const fixture = TestBed.createComponent(AccountReportsLandingComponent); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Report unavailable');
    state.set({ accountGuid: 'account-b', reportGuid: 'account-report' }); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Report unavailable'); expect(accountActions.create).not.toHaveBeenCalled();
  });
});
