import { Location } from '@angular/common';
import { SpyLocation } from '@angular/common/testing';
import { TestBed } from '@angular/core/testing';
import { NavigationCancel } from '@angular/router';
import { firstValueFrom, filter } from 'rxjs';
import { ACCOUNT_REPORT_TYPES } from '@app/v1/shared/reports/report-inventory.models';
import { accountReportSnapshot } from '../testing/account-report-test-fixtures';
import { setupAccountReportWorkbench } from '../testing/account-report-workbench-test-setup';
import { buildSingleFacilityAnalysisPair } from '@data/account-workspace/single-facility-analysis-pairs';

describe('account report workbench', () => {
  it('disables later tabs and Continue immediately for invalid setup and restores them after correction', async () => {
    const snapshot = accountReportSnapshot();
    snapshot.accountReports[0].reportType = 'betterPlants';
    snapshot.accountReports[0].betterPlantsReportSetup.analysisItemId = 'account-analysis';
    const { open, harness } = await setupAccountReportWorkbench(snapshot);
    const workbench = await open();
    const laterTabs = () => [...harness.routeNativeElement!.querySelectorAll('.v1-analysis-stages li')].slice(1);
    const expectBlocked = (blocked: boolean) => {
      harness.detectChanges();
      for (const tab of laterTabs()) expect(!!tab.querySelector('[aria-disabled="true"]')).toBe(blocked);
      expect(!!harness.routeNativeElement!.querySelector('footer button[disabled]')).toBe(blocked);
      expect(harness.routeNativeElement!.querySelector('footer a')?.textContent).toContain('Back');
    };
    expectBlocked(false);
    workbench.editor.form.controls.name.setValue(' '); expectBlocked(true);
    workbench.editor.discard(); expectBlocked(false);
    workbench.editor.form.controls.analysis.setValue(null); expectBlocked(true);
    workbench.editor.discard(); expectBlocked(false);
    for (const year of [null, 2018, 2017, 2024.5]) {
      workbench.editor.form.controls.betterPlants.controls.reportYear.setValue(year); expectBlocked(true);
    }
    workbench.editor.discard(); expectBlocked(false);
    await open('account-report', 'data-checks');
    workbench.editor.form.controls.name.setValue(' '); harness.detectChanges();
    expect(harness.routeNativeElement!.querySelector('footer a')?.getAttribute('href')).toContain('/setup');
    expect(harness.routeNativeElement!.querySelector('footer button[disabled]')?.textContent).toContain('Continue');
    workbench.editor.discard();
  });
  it.each(ACCOUNT_REPORT_TYPES)('opens $value with applicable stages and pending content without writes', async ({ value }) => {
    const snapshot = accountReportSnapshot(); snapshot.accountReports[0].reportType = value;
    const { open, harness, updateSetup, store } = await setupAccountReportWorkbench(snapshot);
    const workbench = await open();
    expect(workbench.context.stages().map(stage => stage.id)).toEqual(['betterPlants', 'performance', 'accountSavings'].includes(value) ? ['setup', 'data-checks', 'report'] : ['setup', 'report']);
    expect(!!harness.routeNativeElement!.querySelector('#account-report-analysis')).toBe(['betterPlants', 'performance', 'analysis', 'accountSavings'].includes(value));
    expect(harness.routeNativeElement!.querySelector('nav a')?.getAttribute('href')).toContain('/account-a/reports/dashboard');
    await open('account-report', 'report');
    expect(workbench.context.stage()).toBe('report');
    if (value === 'betterPlants') {
      expect(harness.routeNativeElement!.querySelector('app-better-plants-preview')).not.toBeNull();
      expect(harness.routeNativeElement!.querySelector('app-better-plants-preview table')).toBeNull();
    } else {
      expect(harness.routeNativeElement!.textContent).toContain('Report content pending');
      expect(harness.routeNativeElement!.textContent).toContain('Setup readiness does not indicate');
    }
    expect(updateSetup).not.toHaveBeenCalled(); expect(store.committedRevision()).toBeUndefined();
  });
  it('flushes before stage changes, reused report routes and dashboard returns', async () => {
    const snapshot = accountReportSnapshot(); snapshot.accountReports[0].reportType = 'betterPlants';
    snapshot.accountReports = [...snapshot.accountReports, { ...snapshot.accountReports[0], id: 41, guid: 'other', name: 'Other report' }];
    const { open, harness, updateSetup, router, store } = await setupAccountReportWorkbench(snapshot);
    const workbench = await open(); workbench.editor.form.controls.name.setValue('Renamed');
    await open('account-report', 'data-checks');
    expect(updateSetup).toHaveBeenCalledWith('account-report', { name: 'Renamed' });
    expect(harness.routeNativeElement!.textContent).toContain('Data Check Pending');
    workbench.editor.form.controls.name.setValue('Final name'); await open('other');
    expect(store.accountReports()[0].name).toBe('Final name'); expect(workbench.editor.form.controls.name.value).toBe('Other report');
    workbench.editor.form.controls.name.setValue('Final other');
    expect(await router.navigateByUrl('/v1/workspace/account/account-a/reports/dashboard')).toBe(true);
    expect(store.accountReports()[1].name).toBe('Final other');
  });
  it('preserves invalid and failed drafts across stage, report, browser Back and account exits', async () => {
    const snapshot = accountReportSnapshot(); snapshot.accountReports = [...snapshot.accountReports, { ...snapshot.accountReports[0], id: 41, guid: 'other' }];
    const { open, router, updateSetup, harness } = await setupAccountReportWorkbench(snapshot);
    await open(); const workbench = await open('other'); workbench.editor.form.controls.name.setValue(' ');
    expect(await router.navigateByUrl('/v1/workspace/account/account-a/reports/workbench/other/report')).toBe(false);
    expect(await router.navigateByUrl('/v1/workspace/account/account-b/reports/workbench/other/setup')).toBe(false);
    expect(await router.navigateByUrl('/elsewhere')).toBe(false);
    const cancelled = firstValueFrom(router.events.pipe(filter(event => event instanceof NavigationCancel)));
    (TestBed.inject(Location) as SpyLocation).simulateUrlPop('/v1/workspace/account/account-a/reports/workbench/account-report/setup');
    await cancelled; await harness.fixture.whenStable(); expect(router.url).toContain('/other/setup');
    workbench.editor.discard(); updateSetup.mockRejectedValueOnce(new Error('Disk full')); workbench.editor.form.controls.name.setValue('Unsaved');
    expect(await router.navigateByUrl('/v1/workspace/account/account-a/reports/dashboard')).toBe(false);
    expect(workbench.editor.form.controls.name.value).toBe('Unsaved'); expect(workbench.editor.error()).toBe('Disk full');
    workbench.editor.retry(); expect(await workbench.editor.flush()).toBe(true);
  });
  it('redirects unsupported stages and inapplicable checks to Setup', async () => {
    const { open, harness, router } = await setupAccountReportWorkbench();
    await open('account-report', 'data-checks'); await harness.fixture.whenStable(); expect(router.url).toContain('/setup');
    await open('account-report', 'unknown'); expect(router.url).toContain('/setup');
  });
  it('offers refresh for a stale water pair independently of the source-energy flag', async () => {
    const snapshot = accountReportSnapshot(true);
    snapshot.facilityAnalyses[0].analysisCategory = 'water'; snapshot.facilityAnalyses[0].energyIsSource = false;
    snapshot.accountAnalyses[0].analysisCategory = 'water'; snapshot.accountAnalyses[0].energyIsSource = false;
    snapshot.accountAnalyses[0].name = 'Stale water analysis';
    const { open, harness, store, updateSetup } = await setupAccountReportWorkbench(snapshot);
    const workbench = await open();
    expect(workbench.context.needsPairRefresh()).toBe(true);
    expect(harness.routeNativeElement!.textContent).toContain('Refresh analysis link');
    const current = buildSingleFacilityAnalysisPair(snapshot.account, snapshot.facilities[0], snapshot.facilityAnalyses[0], snapshot.accountAnalyses[0]);
    store.publishCommittedPatch({ collections: [{ collection: 'accountAnalyses', upsert: [current] }] }); harness.detectChanges();
    expect(workbench.context.needsPairRefresh()).toBe(false);
    expect(updateSetup).not.toHaveBeenCalled();
  });
  it('renders missing, wrong-owner, unavailable-impact and loading/error states without writes', async () => {
    const { open, store, harness, updateSetup } = await setupAccountReportWorkbench();
    await open('missing'); expect(harness.routeNativeElement!.textContent).toContain('Report unavailable');
    const snapshot = accountReportSnapshot(); snapshot.accountReports[0].accountId = 'other'; store.publish(snapshot); await open();
    expect(harness.routeNativeElement!.textContent).toContain('Report unavailable');
    const hidden = accountReportSnapshot(); hidden.account.displayEmissions = false; hidden.accountReports[0].reportType = 'betterClimate'; store.publish(hidden); harness.detectChanges();
    expect(harness.routeNativeElement!.textContent).toContain('Report unavailable');
    store.beginLoad(true); harness.detectChanges(); expect(harness.routeNativeElement!.textContent).toContain('Loading report');
    store.fail({ code: 'load-failed', message: 'Workspace unavailable' }); harness.detectChanges();
    expect(harness.routeNativeElement!.textContent).toContain('Workspace unavailable'); expect(updateSetup).not.toHaveBeenCalled();
  });
  it('protects browser unload only while the editor owns unsaved work', async () => {
    const { open, harness } = await setupAccountReportWorkbench(); const workbench = await open();
    const unload = () => { const event = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(event); return event.defaultPrevented; };
    expect(unload()).toBe(false); workbench.editor.form.controls.name.setValue('Draft'); expect(unload()).toBe(true);
    await workbench.editor.flush(); expect(unload()).toBe(false);
    workbench.editor.form.controls.name.setValue('Later'); harness.fixture.destroy(); expect(unload()).toBe(false);
  });
});
