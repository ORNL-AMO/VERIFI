import { TestBed } from '@angular/core/testing';
import { HomeBrowseSession } from './home-browse-session.service';
import { setupHome, homeRecord } from './testing/home-testing';
import { parseWorkspaceRoute } from '@app/v1/routing/workspace-route';
import { homeDisplayDraft, homeDisplayRaw } from './display-controls/display-controls.component';
describe('Home account-session browsing', () => {
  it('isolates dashboard/owner state, retains invalid input with the last valid request and resets for a new account session', () => {
    const { store, snapshot, route } = setupHome();
    store.publish({ ...snapshot, homeDashboards: [homeRecord('a'), homeRecord('b'), homeRecord('f', 'Facility', 'facility-a')] });
    const browse = TestBed.inject(HomeBrowseSession); TestBed.tick();
    route.set(parseWorkspaceRoute('/v1/workspace/account/account-a/home/dashboard/a'));
    const draft = homeDisplayDraft({ ...homeDisplayRaw({}), period: 'fixed', start: '2024-01', end: '2024-02' }, {});
    browse.update(draft); browse.update({ ...draft, raw: { ...draft.raw, end: '' }, valid: false });
    expect(browse.effective()).toEqual(draft.value); expect(browse.current()?.draft.raw.end).toBe('');
    route.set(parseWorkspaceRoute('/v1/workspace/account/account-a/home/dashboard/b')); expect(browse.current()).toBeUndefined();
    route.set(parseWorkspaceRoute('/v1/workspace/facility/facility-a/home/dashboard/f')); expect(browse.current()).toBeUndefined();
    route.set(parseWorkspaceRoute('/v1/workspace/account/account-a/home/dashboard/a')); expect(browse.effective()).toEqual(draft.value);
    store.publish({ ...snapshot, account: { ...snapshot.account, guid: 'account-b' } }); TestBed.tick();
    store.publish({ ...snapshot, homeDashboards: [homeRecord('a')] }); TestBed.tick();
    expect(browse.current()).toBeUndefined(); expect(browse.effective()).toEqual({});
    browse.update(draft); store.publish({ ...snapshot, homeDashboards: [homeRecord('a')] });
    expect(browse.current()).toBeUndefined();
  });
});
