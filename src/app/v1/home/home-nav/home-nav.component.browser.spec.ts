import { TestBed } from '@angular/core/testing';
import { userEvent } from 'vitest/browser';
import { getNewIdbHomeOwner } from '@data/models/idbModels/homeOwner';
import { homeAccountOwner, homeOwnerState } from '@domain/home/testing/home-fixtures';
import { HomeNavComponent } from './home-nav.component';
import { homeRecord, setupHome } from '../testing/home-testing';

describe('Home navigation in Chromium', () => {
  it('keeps saved order as keyboard order and exposes the owner’s default without writes', async () => {
    const { store, snapshot } = setupHome();
    store.publish({ ...snapshot, homeDashboards: [homeRecord('a'), homeRecord('b')],
      homeOwners: [getNewIdbHomeOwner('account-a', homeAccountOwner, { ...homeOwnerState(['b', 'a']), defaultDashboardGuid: 'a' })] });
    const before = store.snapshot();
    const fixture = TestBed.createComponent(HomeNavComponent); fixture.detectChanges();
    const links = fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>;
    links[0].focus(); expect(document.activeElement).toBe(links[0]);
    expect(links[0].href).toContain('/home/dashboard/b');
    await userEvent.tab(); expect(document.activeElement).toBe(links[1]);
    expect(links[1].getAttribute('aria-current')).toBe('page');
    expect(store.snapshot()).toBe(before);
    fixture.destroy();
  });
});
