import { TestBed } from '@angular/core/testing';
import { parseWorkspaceRoute } from '@app/v1/routing/workspace-route';
import { homeRecord, setupHome } from '../testing/home-testing';
import { HomeDashboardComponent } from './dashboard.component';

describe('Home dashboard recovery', () => {
  it('shows missing-dashboard recovery without silently opening another owner’s dashboard', () => {
    const { store, snapshot, route } = setupHome();
    store.publish({ ...snapshot, homeDashboards: [homeRecord('a')] });
    route.set(parseWorkspaceRoute('/v1/workspace/account/account-a/home/dashboard/deleted'));
    const fixture = TestBed.createComponent(HomeDashboardComponent); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('a').getAttribute('href')).toBe('/v1/workspace/account/account-a/home/dashboard/a');
    expect(fixture.nativeElement.querySelector('h1').textContent).toBe('Home');
  });
  it('retains unsupported dashboards and renders note text without HTML execution', () => {
    const { store, snapshot, route } = setupHome();
    const record = homeRecord('a');
    store.publish({ ...snapshot, homeDashboards: [{ ...record, definition: { version: 1, name: 'Notes', defaults: {}, visibility: 'always', widgets: [{ kind: 'note', id: 'n', size: 'full', visibility: 'always', text: '<b>Plain text</b>' }] } }] });
    const fixture = TestBed.createComponent(HomeDashboardComponent); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.home-note').textContent).toBe('<b>Plain text</b>');
    expect(fixture.nativeElement.querySelector('b')).toBeNull();
    route.set(parseWorkspaceRoute('/v1/workspace/account/account-a/home/dashboard/a'));
    store.publish({ ...snapshot, homeDashboards: [{ ...record, recordVersion: 999 }] }); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('preserved');
  });
});
