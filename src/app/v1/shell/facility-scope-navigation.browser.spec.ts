import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { NavigationCancel } from '@angular/router';
import { filter, firstValueFrom } from 'rxjs';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { setupFacilityScopeNavigation } from './facility-scope-navigation.testing';

describe('facility scope browser history', () => {
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
