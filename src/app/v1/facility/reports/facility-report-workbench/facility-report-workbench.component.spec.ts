import { Location } from '@angular/common';
import { SpyLocation } from '@angular/common/testing';
import { By } from '@angular/platform-browser';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { TestBed } from '@angular/core/testing';
import { NavigationCancel, NavigationEnd } from '@angular/router';
import { filter, firstValueFrom } from 'rxjs';
import { FACILITY_REPORT_TYPES } from '../facility-report.models';
import { reportFacility, reportFixture, reportSnapshot } from '../testing/report-test-fixtures';
import { setupReportWorkbench } from '../testing/report-workbench-test-setup';

describe('facility report workbench navigation', () => {
  it.each(FACILITY_REPORT_TYPES)('opens $label with the correct stages and footer destinations without writing', async ({ value }) => {
    const { harness, open, updateName, store } = await setupReportWorkbench([reportFixture({ facilityReportType: value })]);
    const workbench = await open();
    expect(workbench.context.stages().map(stage => stage.label)).toEqual(['analysis', 'savings', 'costSavings'].includes(value)
      ? ['Setup', 'Data Checks', `${workbench.context.card()!.view.chips![0].label} Report`] : ['Setup', `${workbench.context.card()!.view.chips![0].label} Report`]);
    const footer: HTMLElement = harness.routeNativeElement!.querySelector('footer')!;
    expect(footer.querySelector('a')?.getAttribute('href')).toContain('/reports/dashboard');
    expect(footer.querySelectorAll('a')[1].getAttribute('href')).toContain(workbench.next()!.id);
    expect(harness.routeNativeElement!.textContent).toContain('Report-specific settings');
    await open('report-a', 'report');
    expect(harness.routeNativeElement!.querySelector('footer')?.textContent).toContain('Back to reports');
    expect(harness.routeNativeElement!.querySelector('footer a')?.getAttribute('href')).toContain(['analysis', 'savings', 'costSavings'].includes(value) ? '/data-checks' : '/setup');
    expect(harness.routeNativeElement!.textContent).toContain('preview is pending migration');
    expect(updateName).not.toHaveBeenCalled();
    expect(store.committedRevision()).toBeUndefined();
  });

  it('uses report context, linked breadcrumbs, collapsible facts, and validation badges', async () => {
    const { open, harness, status } = await setupReportWorkbench();
    await open();
    const host = harness.routeNativeElement!;
    const stageIcons = () => harness.routeDebugElement!.query(By.css('app-analysis-stage-navigation')).queryAll(By.directive(IconComponent)).map(icon => (icon.componentInstance as IconComponent).name);
    expect(host.querySelector('h1 app-ui-icon')?.getAttribute('name')).toBe('report');
    const crumbs = host.querySelectorAll('nav[aria-label="Facility report breadcrumb"] a');
    expect(crumbs[0].getAttribute('href')).toBe('/v1/workspace/account/account-a/reports/dashboard');
    expect(crumbs[1].getAttribute('href')).toBe(crumbs[2].getAttribute('href'));
    expect(crumbs[1].getAttribute('href')).toContain('/facility-a/reports/dashboard');
    expect(host.querySelector('header')?.textContent).toContain('No Issues');
    expect(stageIcons()).toContain('checkmarkBadge');
    const toggle = host.querySelector<HTMLButtonElement>('button[aria-controls="report-workbench-facts"]')!;
    toggle.click();
    harness.detectChanges();
    expect(host.querySelector<HTMLElement>('#report-workbench-facts')?.hidden).toBe(true);
    status.state.set('evaluating');
    harness.detectChanges();
    expect(host.querySelector('header')?.textContent).toContain('Checking setup');
    expect(stageIcons()).not.toContain('checkmarkBadge');
    status.items.set([{ id: 'invalid-setup', severity: 'error', description: 'Select a reporting period.', entity: {
      kind: 'facility-report', guid: 'report-a', facilityGuid: 'facility-a', accountGuid: 'account-a'
    } } as import('@app/v1/status/status.models').StatusItem]);
    status.state.set('ready');
    harness.detectChanges();
    expect(host.querySelector('header')?.textContent).toContain('Needs attention');
    expect(stageIcons()).toContain('badgeAlert');
    expect(host.querySelector('app-facility-report-setup')?.textContent).toContain('Select a reporting period.');
  });

  it('keeps drafts across stages and flushes before same-component report switching or dashboard return', async () => {
    const { harness, open, router, updateName, store } = await setupReportWorkbench();
    const workbench = await open();
    workbench.editor.name.setValue('New name');
    await open('report-a', 'data-checks');
    expect(workbench.editor.name.value).toBe('New name');
    expect(updateName).not.toHaveBeenCalled();
    expect(harness.routeNativeElement!.textContent).toContain('does not complete checks');
    workbench.switchReport('report-b');
    await harness.fixture.whenStable();
    expect(store.facilityReports().find(report => report.guid === 'report-a')?.name).toBe('New name');
    expect(workbench.editor.name.value).toBe('Overview');
    workbench.editor.name.setValue('Changed overview');
    expect(await router.navigateByUrl('/v1/workspace/facility/facility-a/reports/dashboard')).toBe(true);
    expect(store.facilityReports().find(report => report.guid === 'report-b')?.name).toBe('Changed overview');
  });

  it('retains invalid and failed drafts across attempted report switches and context exits', async () => {
    const { open, router, updateName } = await setupReportWorkbench();
    const workbench = await open();
    workbench.editor.name.setValue(' ');
    expect(await router.navigateByUrl('/v1/workspace/facility/facility-a/reports/workbench/report-b/setup')).toBe(false);
    expect(await router.navigateByUrl('/v1/workspace/facility/facility-b/reports/workbench/report-a/setup')).toBe(false);
    expect(await router.navigateByUrl('/elsewhere')).toBe(false);
    expect(router.url).toContain('/facility-a/reports/workbench/report-a/setup');
    workbench.editor.discard();
    updateName.mockRejectedValueOnce(new Error('Save unavailable'));
    workbench.editor.name.setValue('Failed draft');
    expect(await router.navigateByUrl('/v1/workspace/facility/facility-a/reports/dashboard')).toBe(false);
    expect(workbench.editor.name.value).toBe('Failed draft');
    workbench.editor.retry();
    await workbench.editor.flush();
    expect(await router.navigateByUrl('/v1/workspace/facility/facility-a/reports/dashboard')).toBe(true);
  });

  it('resolves only an owned, available report and keeps validation failures separate from pending stages', async () => {
    const { harness, open, store, status } = await setupReportWorkbench();
    await open('missing');
    expect(harness.routeNativeElement!.textContent).toContain('Report unavailable');
    store.publish(reportSnapshot([reportFixture({ accountId: 'account-b' })]), { facility: reportFacility });
    await open();
    expect(harness.routeNativeElement!.textContent).toContain('Report unavailable');
    store.publish(reportSnapshot([reportFixture({ facilityId: 'facility-b' })]), { facility: reportFacility });
    await open();
    expect(harness.routeNativeElement!.textContent).toContain('Report unavailable');
    const snapshot = reportSnapshot([reportFixture({ facilityReportType: 'emissionFactors' })]);
    store.publish({ ...snapshot, account: { ...snapshot.account, displayEmissions: false } }, { facility: reportFacility });
    await open();
    expect(harness.routeNativeElement!.querySelector('h1')).toBeNull();
    store.publish(reportSnapshot(), { facility: reportFacility });
    status.state.set('error');
    await open('report-a', 'report');
    expect(harness.routeNativeElement!.textContent).toContain('Setup status unavailable');
    expect(harness.routeNativeElement!.textContent).toContain('preview is pending migration');
  });

  it('protects report-to-report browser history navigation until invalid changes are discarded', async () => {
    const { open, harness, router } = await setupReportWorkbench();
    await open();
    const workbench = await open('report-b');
    workbench.editor.name.setValue(' ');
    const location = TestBed.inject(Location) as SpyLocation;
    const cancelled = firstValueFrom(router.events.pipe(filter(event => event instanceof NavigationCancel)));
    location.simulateUrlPop('/v1/workspace/facility/facility-a/reports/workbench/report-a/setup');
    await cancelled;
    await harness.fixture.whenStable();
    expect(router.url).toContain('/report-b/setup');
    expect(workbench.editor.state()).toBe('invalid');
    workbench.editor.discard();
    const completed = firstValueFrom(router.events.pipe(filter(event => event instanceof NavigationEnd)));
    location.simulateUrlPop('/v1/workspace/facility/facility-a/reports/workbench/report-a/setup');
    await completed;
    await harness.fixture.whenStable();
    expect(router.url).toContain('/report-a/setup');
  });

  it('redirects inapplicable Data Checks links to Setup', async () => {
    const { open, router, harness } = await setupReportWorkbench();
    await open('report-b', 'data-checks');
    await harness.fixture.whenStable();
    expect(router.url).toContain('/report-b/setup');
  });

  it('shows workspace loading and failure states with return navigation', async () => {
    const { open, harness, store } = await setupReportWorkbench();
    await open();
    store.beginLoad(true);
    harness.detectChanges();
    expect(harness.routeNativeElement!.textContent).toContain('Loading report');
    store.fail({ code: 'load-failed', message: 'Workspace unavailable' });
    harness.detectChanges();
    expect(harness.routeNativeElement!.textContent).toContain('Workspace unavailable');
    expect(harness.routeNativeElement!.querySelector('a')?.getAttribute('href')).toContain('/reports/dashboard');
  });

  it('protects browser unload for edits and saving, with Angular-owned cleanup', async () => {
    const { open, harness, updateName } = await setupReportWorkbench();
    const workbench = await open();
    const unload = () => {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };
    expect(unload()).toBe(false);
    workbench.editor.name.setValue('Draft');
    expect(unload()).toBe(true);
    let resolve!: (report: ReturnType<typeof reportFixture>) => void;
    updateName.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const saving = workbench.editor.flush();
    expect(unload()).toBe(true);
    resolve(reportFixture({ name: 'Draft' }));
    await saving;
    expect(unload()).toBe(false);
    workbench.editor.name.setValue('Another draft');
    harness.fixture.destroy();
    expect(unload()).toBe(false);
  });
});
