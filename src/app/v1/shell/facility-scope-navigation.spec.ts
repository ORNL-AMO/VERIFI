import { TestBed } from '@angular/core/testing';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { reportFacility } from '@app/v1/reports/facility/testing/report-test-fixtures';
import { setupFacilityScopeNavigation as setup } from './facility-scope-navigation.testing';

describe('facility scope navigation', () => {

  it('derives presentation from the ready owned facility rather than remembered selection', async () => {
    const view = await setup();
    const snapshot = view.store.snapshot()!;
    const sole = { ...snapshot.facilities[0], name: 'Distinct plant' };
    view.store.publish({ ...snapshot, account: { ...snapshot.account, isSingleFacilityCompany: true }, facilities: [sole] });
    view.fixture.detectChanges();
    expect(view.navigation.singleFacilityContext()?.guid).toBe(sole.guid);
    expect(view.navigation.singleFacilityContext()?.name).toBe('Distinct plant');
    view.store.beginLoad(false); view.fixture.detectChanges();
    expect(view.navigation.singleFacilityContext()).toBeUndefined();
    view.store.publish({ ...snapshot, account: { ...snapshot.account, isSingleFacilityCompany: true }, facilities: [] }); view.fixture.detectChanges();
    expect(view.navigation.singleFacilityContext()).toBeUndefined();
    expect(view.navigation.hasSingleSiteRecovery()).toBe(true);
    view.store.publish({ ...snapshot, account: { ...snapshot.account, isSingleFacilityCompany: true } }); view.fixture.detectChanges();
    expect(view.navigation.singleFacilityContext()).toBeUndefined();
    expect(view.navigation.hasSingleSiteRecovery()).toBe(true);
    view.store.publish({ ...snapshot, account: { ...snapshot.account, isSingleFacilityCompany: false }, facilities: [sole] }); view.fixture.detectChanges();
    expect(view.navigation.singleFacilityContext()).toBeUndefined();
  });

  it('starts at All despite durable facility hints and carries scope across sections', async () => {
    const { navigation, router, fixture } = await setup();
    expect(navigation.headerScope()).toEqual({ kind: 'all' });
    expect(await navigation.changeFacilityScope({ kind: 'facility', facilityGuid: 'facility-b' })).toBe(true);
    expect(router.url).toContain('/meters?facility=facility-b');
    await navigation.openSection('analysis'); await fixture.whenStable();
    expect(router.url).toContain('/analysis/dashboard?facility=facility-b');
    await navigation.openSection('reports'); await fixture.whenStable();
    expect(router.url).toContain('/reports/dashboard?facility=facility-b');
    await navigation.changeFacilityScope({ kind: 'all' });
    expect(router.url).not.toContain('?');
  });

  it('preserves the named facility when entering Meters through the Data section', async () => {
    const { navigation, router } = await setup('/v1/workspace/account/account-a/analysis/dashboard?facility=facility-b');
    await navigation.openSection('data');
    expect(router.url).toBe('/v1/workspace/account/account-a/data/portfolio/meters?facility=facility-b');
    expect(navigation.headerScope()).toEqual({ kind: 'facility', facilityGuid: 'facility-b' });
  });

  it('keeps Data entry at All facilities independent of remembered facility selection', async () => {
    const { navigation, router } = await setup('/v1/workspace/account/account-a/analysis/dashboard');
    await navigation.openSection('data');
    expect(router.url).toBe('/v1/workspace/account/account-a/data/portfolio/facilities');
    expect(navigation.headerScope()).toEqual({ kind: 'all' });
  });

  it('opens scoped Meters when choosing a facility from Facilities and retains other inventory destinations', async () => {
    const { navigation, router } = await setup('/v1/workspace/account/account-a/data/portfolio/facilities');
    expect(await navigation.changeFacilityScope({ kind: 'facility', facilityGuid: 'facility-b' })).toBe(true);
    expect(router.url).toBe('/v1/workspace/account/account-a/data/portfolio/meters?facility=facility-b');
    await router.navigateByUrl('/v1/workspace/account/account-a/data/portfolio/facilities');
    await navigation.changeFacilityScope({ kind: 'all' });
    expect(router.url).toBe('/v1/workspace/account/account-a/data/portfolio/facilities');
    await router.navigateByUrl('/v1/workspace/account/account-a/data/portfolio/predictors?facility=facility-a');
    await navigation.changeFacilityScope({ kind: 'facility', facilityGuid: 'facility-b' });
    expect(router.url).toBe('/v1/workspace/account/account-a/data/portfolio/predictors?facility=facility-b');
  });

  it('retains the current facility and URL when Data or Facilities chooser navigation is blocked or fails', async () => {
    const { navigation, router, canLeave } = await setup('/v1/workspace/facility/facility-a/data/meters/meter-a/settings');
    canLeave.set(false); await navigation.openSection('data');
    expect(router.url).toBe('/v1/workspace/facility/facility-a/data/meters/meter-a/settings');
    expect(navigation.headerFacility()?.guid).toBe('facility-a');
    canLeave.set(true); await navigation.openSection('data');
    expect(router.url).toBe('/v1/workspace/account/account-a/data/portfolio/meters?facility=facility-a');
    await router.navigateByUrl('/v1/workspace/account/account-a/data/portfolio/facilities');
    const unregister = TestBed.inject(UnsavedChangesService).register(() => false, () => {}, () => true);
    expect(await navigation.changeFacilityScope({ kind: 'facility', facilityGuid: 'facility-b' })).toBe(false);
    expect(router.url).toBe('/v1/workspace/account/account-a/data/portfolio/facilities');
    expect(navigation.headerScope()).toEqual({ kind: 'all' });
    unregister();
    vi.spyOn(router, 'navigate').mockRejectedValueOnce(new Error('Navigation failed'));
    expect(await navigation.changeFacilityScope({ kind: 'facility', facilityGuid: 'facility-b' })).toBe(false);
    expect(navigation.headerScope()).toEqual({ kind: 'all' });
    expect(router.url).toBe('/v1/workspace/account/account-a/data/portfolio/facilities');
  });

  it('implicitly scopes single-site Data/Analysis while preserving combined account Reports', async () => {
    const { navigation, store, router, fixture } = await setup();
    const snapshot = store.snapshot()!;
    store.publish({ ...snapshot, account: { ...snapshot.account, isSingleFacilityCompany: true }, facilities: snapshot.facilities.slice(0, 1) });
    fixture.detectChanges(); await fixture.whenStable();
    expect(navigation.inventoryFacilityGuid()).toBe('facility-a');
    expect(navigation.contextFacility()?.guid).toBe('facility-a');
    expect(navigation.facilityInventoryLink('facility-a', 'meters')).toEqual({ route: navigation.accountPortfolioRoute('account-a', 'meters'), queryParams: {} });
    await navigation.openSection('analysis');
    expect(router.url).toBe('/v1/workspace/account/account-a/analysis/dashboard');
    expect(navigation.inventoryFacilityGuid()).toBe('facility-a');
    await navigation.openSection('reports');
    expect(router.url).toBe('/v1/workspace/account/account-a/reports/dashboard');
    expect(navigation.inventoryFacilityGuid()).toBeUndefined(); expect(navigation.contextFacility()).toBeUndefined();
    await navigation.openSection('data');
    expect(router.url).toBe('/v1/workspace/account/account-a/data/portfolio/meters');
  });

  it('resolves copied URLs and normalizes foreign or deleted facilities only after workspace readiness', async () => {
    const { navigation, router, store, fixture } = await setup('/v1/workspace/account/account-a/data/portfolio/meters?facility=facility-b');
    expect(navigation.inventoryFacilityGuid()).toBe('facility-b');
    const unregister = TestBed.inject(UnsavedChangesService).register(() => false, () => {}, () => true);
    store.publish({ ...store.snapshot()!, facilities: [reportFacility] });
    fixture.detectChanges(); await fixture.whenStable();
    expect(navigation.inventoryScope()).toEqual({ kind: 'all' });
    expect(router.url).not.toContain('facility=');
    expect(navigation.scopeNotice()).toContain('unavailable');
    unregister();
    await router.navigateByUrl('/v1/workspace/account/account-a/reports/dashboard?facility=foreign');
    fixture.detectChanges(); await fixture.whenStable();
    expect(router.url).not.toContain('foreign');
    await router.navigateByUrl('/v1/workspace/account/account-b/reports/dashboard?facility=facility-a');
    expect(navigation.inventoryScope()).toEqual({ kind: 'all' });
  });

  it('blocks query-only changes while a report editor is dirty, including direct router/history transitions', async () => {
    const { navigation, router } = await setup('/v1/workspace/account/account-a/reports/dashboard?facility=facility-a');
    const changes = TestBed.inject(UnsavedChangesService);
    const unregister = changes.register(() => true, () => {}, () => true);
    expect(await navigation.changeFacilityScope({ kind: 'facility', facilityGuid: 'facility-b' })).toBe(false);
    expect(await router.navigateByUrl('/v1/workspace/account/account-a/reports/dashboard')).toBe(false);
    expect(navigation.inventoryFacilityGuid()).toBe('facility-a');
    unregister();
    expect(await router.navigateByUrl('/v1/workspace/account/account-a/reports/dashboard')).toBe(true);
  });

  it('shows workbench ownership and retains it when leaving is cancelled without selecting another facility', async () => {
    const { navigation, router, workspaceService, canLeave } = await setup('/v1/workspace/facility/facility-a/data/meters/meter-a/settings');
    expect(navigation.headerScope()).toEqual({ kind: 'facility', facilityGuid: 'facility-a' });
    canLeave.set(false);
    expect(await navigation.changeFacilityScope({ kind: 'facility', facilityGuid: 'facility-b' })).toBe(false);
    expect(router.url).toContain('/facility/facility-a/');
    expect(navigation.headerFacility()?.guid).toBe('facility-a');
    expect(workspaceService.selectFacility).not.toHaveBeenCalled();
    canLeave.set(true);
    expect(await navigation.changeFacilityScope({ kind: 'facility', facilityGuid: 'facility-b' })).toBe(true);
    expect(router.url).toContain('/account/account-a/data/portfolio/meters?facility=facility-b');
  });

  it('keeps settings detail, defaults unsupported details, and guards the home action', async () => {
    const { navigation, router } = await setup('/v1/workspace/account/account-a/settings/portfolio');
    await navigation.changeFacilityScope({ kind: 'facility', facilityGuid: 'facility-b' });
    expect(router.url).toBe('/v1/workspace/facility/facility-b/settings/profile');
    await navigation.changeFacilityScope({ kind: 'all' });
    expect(router.url).toBe('/v1/workspace/account/account-a/settings/profile');
    const unregister = TestBed.inject(UnsavedChangesService).register(() => true, () => {}, () => true);
    await navigation.showWelcome();
    expect(router.url).toContain('/settings/profile');
    unregister();
    await navigation.showWelcome();
    expect(router.url).toBe('/v1');
  });
});
