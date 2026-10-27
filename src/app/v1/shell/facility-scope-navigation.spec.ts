import { TestBed } from '@angular/core/testing';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { reportFacility } from '@app/v1/facility/reports/testing/report-test-fixtures';
import { setupFacilityScopeNavigation as setup } from './facility-scope-navigation.testing';

describe('facility scope navigation', () => {

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

  it('clears scope when entering Facilities through the Data section', async () => {
    const { navigation, router } = await setup('/v1/workspace/account/account-a/analysis/dashboard?facility=facility-b');
    await navigation.openSection('data');
    expect(router.url).not.toContain('facility=');
    expect(navigation.headerScope()).toEqual({ kind: 'all' });
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
