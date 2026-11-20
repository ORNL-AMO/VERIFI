import { TestBed } from '@angular/core/testing';
import { homeRecord, setupHome } from '../testing/home-testing';
import { HomeNavComponent } from './home-nav.component';

describe('Home sidebar', () => {
  it('links long dashboard names to their owner and marks the resolved selection', () => {
    const { store, snapshot } = setupHome();
    store.publish({ ...snapshot, homeDashboards: [homeRecord('a', 'A very long dashboard name'), homeRecord('facility', 'Other owner', 'facility-a')] });
    const fixture = TestBed.createComponent(HomeNavComponent); fixture.detectChanges();
    const links = fixture.nativeElement.querySelectorAll('a');
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe('/v1/workspace/account/account-a/home/dashboard/a');
    expect(links[0].getAttribute('aria-current')).toBe('page');
  });
});
