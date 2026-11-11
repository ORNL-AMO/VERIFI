import { TestBed } from '@angular/core/testing';
import { makeFinding } from '@app/v1/status/status.models';
import { presentFindings } from '@app/v1/status/status.catalog';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { reportFixture } from '@app/v1/reports/facility/testing/report-test-fixtures';
import { meter } from '@app/v1/data/meters/facility-meters.testing';
import { SectionNavModule } from './section-nav/section-nav.module';
import { DataNavComponent } from './section-nav/data-nav/data-nav.component';
import { ReportsNavComponent } from './section-nav/reports-nav/reports-nav.component';
import { SectionNavDisclosureService } from './section-nav/section-nav-disclosure.service';
import { setupFacilityScopeNavigation as setup } from './facility-scope-navigation.testing';

describe('contextual workspace navigation', () => {
  it('preserves the single-site account Reports exception behind its static header label', async () => {
    const { navigation, store, fixture } = await setup('/v1/workspace/account/account-a/reports/dashboard');
    const snapshot = store.snapshot()!;
    store.publish({ ...snapshot, account: { ...snapshot.account, isSingleFacilityCompany: true }, facilities: snapshot.facilities.slice(0, 1) });
    fixture.detectChanges(); await fixture.whenStable();
    expect(navigation.headerFacility()?.guid).toBe('facility-a');
    expect(navigation.effectiveScope()).toEqual({ kind: 'all' });
    expect(navigation.contextFacility()).toBeUndefined();
  });
  it('renders facility resource links on filtered account routes, without a Facilities shortcut and with account custom-data access', async () => {
    TestBed.configureTestingModule({ imports: [SectionNavModule], providers: [SectionNavDisclosureService] });
    const { navigation, store, router } = await setup('/v1/workspace/account/account-a/data/portfolio/meters?facility=facility-b');
    store.publish({ ...store.snapshot()!, meters: [meter({ guid: 'meter-a', accountId: 'account-a', facilityId: 'facility-a' }),
      meter({ guid: 'meter-b', accountId: 'account-a', facilityId: 'facility-b' })],
      facilityReports: [reportFixture(), reportFixture({ guid: 'report-b', name: 'Report B', facilityId: 'facility-b' })] });
    const data = TestBed.createComponent(DataNavComponent); data.detectChanges();
    expect(data.componentInstance.groups()[0].children.map(item => item.id)).toEqual(['meter-b']);
    const meterLink = [...data.nativeElement.querySelectorAll('a')] .find((link: HTMLAnchorElement) => link.textContent.trim() === 'Meters') as HTMLAnchorElement;
    expect(meterLink.getAttribute('href')).toContain('/account/account-a/data/portfolio/meters?facility=facility-b');
    expect(data.nativeElement.textContent).not.toContain('Custom Database Items');
    const facilitiesLink = [...data.nativeElement.querySelectorAll('a')].find((link: HTMLAnchorElement) => link.textContent.trim() === 'Facilities') as HTMLAnchorElement;
    expect(facilitiesLink).toBeUndefined();
    await router.navigateByUrl('/v1/workspace/account/account-a/reports/dashboard?facility=facility-b');
    const reports = TestBed.createComponent(ReportsNavComponent); reports.detectChanges();
    expect(reports.componentInstance.reportGroups().flatMap(group => group.reports.map(report => report.guid))).toEqual(['report-b']);
    await navigation.changeFacilityScope({ kind: 'all' }); data.detectChanges(); reports.detectChanges();
    expect(data.nativeElement.textContent).toContain('Custom Database Items');
    expect(reports.componentInstance.reportGroups()).toEqual([]);
  });
  it('scopes support findings and discarded warnings while retaining the Data-only presentation rule', async () => {
    const { navigation, router, status } = await setup('/v1/workspace/account/account-a/reports/dashboard?facility=facility-b');
    const items = presentFindings([
      ...['facility-a', 'facility-b'].map(facilityGuid => makeFinding('meter.currency.stale', 'warning', 'currency',
        { kind: 'meter', guid: `meter-${facilityGuid}`, name: 'Meter', accountGuid: 'account-a', facilityGuid })),
      makeFinding('report.configuration.invalid', 'error', 'configuration',
        { kind: 'facility-report', guid: 'report-b', name: 'Report', accountGuid: 'account-a', facilityGuid: 'facility-b' })
    ]);
    status.accountTodos.set(items);
    status.discardedItems.set(items);
    expect(navigation.panelContent().todos.map(item => item.entity.guid)).toEqual(['report-b', 'meter-facility-b']);
    expect(navigation.panelContent().discardedWarnings).toEqual(navigation.panelContent().todos);
    await router.navigateByUrl('/v1/workspace/account/account-a/data/portfolio/meters?facility=facility-b');
    expect(navigation.panelContent().todos.map(item => item.entity.guid)).toEqual(['meter-facility-b']);
    await router.navigateByUrl('/v1/workspace/account/account-a/reports/dashboard');
    expect(navigation.panelContent().todos).toHaveLength(3);
  });
  it('projects committed ownership instead of remembered facility selection and combines All-facility counts', async () => {
    const { navigation, store, router, fixture } = await setup('/v1/workspace/account/account-a/reports/dashboard?facility=facility-b');
    const base = store.snapshot()!;
    store.publish({ ...base, facilityReports: [reportFixture(), reportFixture({ guid: 'report-b', facilityId: 'facility-b' })] }, { facility: base.facilities[0] });
    fixture.detectChanges(); await fixture.whenStable();
    expect(store.selectedFacility()?.guid).toBe('facility-a');
    expect(navigation.contextFacility()?.guid).toBe('facility-b');
    expect(navigation.contextReports().map(report => report.guid)).toEqual(['report-b']);
    expect(navigation.panelContent().results.find(row => row.label === 'Reports')?.value).toBe('1');
    await router.navigateByUrl('/v1/workspace/account/account-a/reports/dashboard');
    expect(navigation.contextFacility()).toBeUndefined();
    expect(navigation.panelContent().results.find(row => row.label === 'Reports')?.value).toBe('2');
  });

  it('opens scoped settings and keeps Upload mapping context separate from the return inventory scope', async () => {
    const { navigation, router } = await setup('/v1/workspace/account/account-a/data/portfolio/meters?facility=facility-b');
    expect(navigation.uploadQuery()).toEqual({ facilityGuid: 'facility-b', returnUrl: router.url });
    const origin = router.url;
    await navigation.openSection('imports');
    const uploadParams = router.parseUrl(router.url).queryParamMap;
    expect(uploadParams.get('facilityGuid')).toBe('facility-b');
    expect(uploadParams.get('facility')).toBeNull();
    expect(uploadParams.get('returnUrl')).toBe(origin);
    await router.navigateByUrl(origin);
    await navigation.openSection('settings');
    expect(router.url).toBe('/v1/workspace/facility/facility-b/settings/profile');
    await navigation.changeFacilityScope({ kind: 'all' });
    expect(router.url).toBe('/v1/workspace/account/account-a/settings/profile');
    expect(navigation.uploadQuery()).toEqual({});
  });

  it.each([
    ['/v1/workspace/account/account-a/settings/data-validation', undefined],
    ['/v1/workspace/facility/facility-a/settings/profile', 'facility-a'],
    ['/v1/workspace/account/account-a/imports/upload?returnUrl=old-import', undefined]
  ])('omits non-data Upload origins while retaining initial facility context: %s', async (url, facilityGuid) => {
    const { navigation, router } = await setup(url!);
    expect(navigation.uploadQuery()).toEqual(facilityGuid ? { facilityGuid } : {});
    await navigation.openSection('imports');
    const params = router.parseUrl(router.url).queryParamMap;
    expect(params.get('returnUrl')).toBeNull();
    expect(params.get('facilityGuid')).toBe(facilityGuid ?? null);
  });

  it('keeps context on failed navigation and rejects rapid scope changes while flushing', async () => {
    const { navigation, router } = await setup('/v1/workspace/account/account-a/data/portfolio/meters?facility=facility-a');
    const url = router.url;
    const changes = TestBed.inject(UnsavedChangesService);
    let finish!: (allowed: boolean) => void;
    const flush = vi.spyOn(changes, 'flushPendingChanges').mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const pending = navigation.changeFacilityScope({ kind: 'facility', facilityGuid: 'facility-b' });
    expect(await navigation.changeFacilityScope({ kind: 'all' })).toBe(false);
    expect(router.url).toBe(url);
    await vi.waitFor(() => expect(flush).toHaveBeenCalledOnce());
    finish(false); expect(await pending).toBe(false); flush.mockRestore();
    vi.spyOn(router, 'navigate').mockRejectedValueOnce(new Error('Navigation failed'));
    expect(await navigation.changeFacilityScope({ kind: 'facility', facilityGuid: 'facility-b' })).toBe(false);
    expect(router.url).toBe(url); expect(navigation.contextFacility()?.guid).toBe('facility-a');
    expect(navigation.scopeChangePending()).toBe(false);
    expect(navigation.contextNavigationError()).toContain('retained');
  });

  it('builds owner-filtered inventory links without changing workbench ownership', async () => {
    const { navigation } = await setup('/v1/workspace/facility/facility-a/data/meters/meter-a/settings');
    expect(navigation.facilityInventoryLink('facility-a', 'meters')).toEqual({
      route: ['/v1', 'workspace', 'account', 'account-a', 'data', 'portfolio', 'meters'], queryParams: { facility: 'facility-a' }
    });
    expect(navigation.accountDataReturnRoute('account-a')).toEqual(['/v1', 'workspace', 'account', 'account-a', 'data', 'portfolio', 'meters']);
    expect(navigation.headerFacility()?.guid).toBe('facility-a');
  });
});
