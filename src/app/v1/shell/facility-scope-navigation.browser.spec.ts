import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { NavigationCancel } from '@angular/router';
import { filter, firstValueFrom } from 'rxjs';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { setupFacilityScopeNavigation } from './facility-scope-navigation.testing';

describe('facility scope browser history', () => {
  it('returns to Facilities with Back after choosing a facility and preserves scope through the Data rail', async () => {
    const { navigation, router, fixture } = await setupFacilityScopeNavigation('/v1/workspace/account/account-a/data/portfolio/facilities');
    router.setUpLocationChangeListener();
    const location = TestBed.inject(Location);
    try {
      await navigation.changeFacilityScope({ kind: 'facility', facilityGuid: 'facility-b' });
      expect(router.url).toBe('/v1/workspace/account/account-a/data/portfolio/meters?facility=facility-b');
      await navigation.openSection('analysis');
      await navigation.openSection('data');
      expect(router.url).toBe('/v1/workspace/account/account-a/data/portfolio/meters?facility=facility-b');
      expect(navigation.headerFacility()?.guid).toBe('facility-b');
      location.back(); await vi.waitFor(() => expect(router.url).toContain('/analysis/dashboard?facility=facility-b'));
      location.back(); await vi.waitFor(() => expect(router.url).toContain('/data/portfolio/meters?facility=facility-b'));
      location.back(); await vi.waitFor(() => expect(router.url).toBe('/v1/workspace/account/account-a/data/portfolio/facilities'));
      expect(navigation.headerScope()).toEqual({ kind: 'all' });
      location.forward(); await vi.waitFor(() => expect(router.url).toContain('/data/portfolio/meters?facility=facility-b'));
      expect(navigation.headerFacility()?.guid).toBe('facility-b');
    } finally { fixture.destroy(); }
  });
  it('restores scope with Back/Forward and cancels query-only history changes while an editor is blocked', async () => {
    const { navigation, router, fixture } = await setupFacilityScopeNavigation();
    router.setUpLocationChangeListener();
    const location = TestBed.inject(Location);
    await navigation.changeFacilityScope({ kind: 'facility', facilityGuid: 'facility-a' });
    await navigation.changeFacilityScope({ kind: 'facility', facilityGuid: 'facility-b' });
    location.back();
    await vi.waitFor(() => expect(navigation.inventoryFacilityGuid()).toBe('facility-a'));
    location.forward();
    await vi.waitFor(() => expect(navigation.inventoryFacilityGuid()).toBe('facility-b'));

    const unregister = TestBed.inject(UnsavedChangesService).register(() => true, () => {}, () => true);
    const cancelled = firstValueFrom(router.events.pipe(filter(event => event instanceof NavigationCancel)));
    location.back(); await cancelled;
    expect(router.url).toContain('facility=facility-b');
    expect(navigation.headerFacility()?.guid).toBe('facility-b');
    unregister(); fixture.destroy();
  });
});
