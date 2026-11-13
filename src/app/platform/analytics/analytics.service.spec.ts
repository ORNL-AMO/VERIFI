import { HttpClient } from '@angular/common/http';
import { Event, NavigationCancel, NavigationCancellationCode, NavigationEnd, NavigationError, NavigationSkipped, NavigationSkippedCode, NavigationStart, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { AnalyticsDataDbService } from '@data/indexedDB/analytics-data-db.service';
import { ElectronService } from '@platform/electron/electron.service';
import { environment } from 'src/environments/environment';
import { AnalyticsService } from './analytics.service';

const DISABLE_KEY = 'ga-disable-G-YG1QD02XSE';

describe('analytics collection', () => {
  let service: AnalyticsService;
  let events: Subject<Event>;
  let dom: Document;
  let browser: any;
  let electron: { isElectron: boolean };
  let post: ReturnType<typeof vi.fn>;
  let storage: { getAppAnalyticsData: ReturnType<typeof vi.fn>; addWithObservable: ReturnType<typeof vi.fn> };
  let navigationId: number;
  const originalEnabled = environment.analyticsEnabled;
  const originalProduction = environment.production;

  beforeEach(() => {
    environment.analyticsEnabled = true;
    environment.production = true;
    navigationId = 0;
    events = new Subject<Event>();
    browser = { location: { hostname: 'verifi.ornl.gov', protocol: 'https:' } };
    dom = document.implementation.createHTMLDocument();
    Object.defineProperty(dom, 'defaultView', { value: browser });
    electron = { isElectron: false };
    post = vi.fn(() => of(null));
    storage = {
      getAppAnalyticsData: vi.fn(() => of([{ clientId: 'existing-client' }])),
      addWithObservable: vi.fn(() => of(1))
    };
    service = new AnalyticsService(
      { post } as unknown as HttpClient,
      storage as unknown as AnalyticsDataDbService,
      electron as ElectronService,
      { events } as unknown as Router,
      dom
    );
    service.initialize();
  });

  afterEach(() => {
    service.ngOnDestroy();
    environment.analyticsEnabled = originalEnabled;
    environment.production = originalProduction;
  });

  function navigate(path: string, initialPath = path): void {
    const id = ++navigationId;
    events.next(new NavigationStart(id, initialPath));
    events.next(new NavigationEnd(id, initialPath, path));
  }

  function commands(): any[][] {
    return (browser.dataLayer || []).map((entry: IArguments) => Array.from(entry));
  }

  function collectedEvents(): any[][] {
    return commands().filter(command => command[0] === 'event');
  }

  it('does not initialize the tag or send startup events before a route commits', () => {
    service.sendEvent('verifi_app_open');
    expect(browser[DISABLE_KEY]).toBe(true);
    expect(dom.querySelector('script')).toBeNull();
    expect(collectedEvents()).toEqual([]);
  });

  it.each([false, true])('keeps disabled deployments silent with production=%s', async production => {
    environment.analyticsEnabled = false;
    environment.production = production;
    navigate('/welcome');
    service.sendEvent('import_backup_file');
    electron.isElectron = true;
    await service.initAnalyticsSession('/welcome');
    await service.sendAnalyticsPageView('/welcome');
    service.postEventToMeasurementProtocol({ name: 'page_view', params: { page_path: '/welcome', session_id: 'test' } });
    expect(dom.querySelector('script')).toBeNull();
    expect(collectedEvents()).toEqual([]);
    expect(post).not.toHaveBeenCalled();
    expect(storage.getAppAnalyticsData).not.toHaveBeenCalled();
  });

  it.each(['dev.verifi.ornl.gov', 'qa.verifi.ornl.gov', 'localhost', 'verifi.ornl.gov.example.com'])('rejects browser collection on %s even in a production build', hostname => {
    browser.location.hostname = hostname;
    navigate('/welcome');
    service.sendEvent('create_account');
    expect(dom.querySelector('script')).toBeNull();
    expect(collectedEvents()).toEqual([]);
  });

  it('requires HTTPS for browser collection', () => {
    browser.location.protocol = 'http:';
    navigate('/welcome');
    expect(dom.querySelector('script')).toBeNull();
  });

  it.each(['/v1', '/v1/data?tab=meters#details', '/v1/settings', '/v1;mode=preview', '/v1#/welcome', '/v1/data#/welcome', 'file:///app/index.html#/v1'])('blocks initial loads and refreshes of %s, including custom events without a path', async path => {
    navigate(path, '/');
    service.sendEvent('import_backup_file');
    expect(dom.querySelector('script')).toBeNull();
    expect(collectedEvents()).toEqual([]);
    electron.isElectron = true;
    await service.sendAnalyticsEvent('create_account', { session_id: 'test' });
    expect(post).not.toHaveBeenCalled();
  });

  it('initializes once, sends one app-open event, and preserves production page views', () => {
    service.initialize();
    navigate('/welcome');
    navigate('/data-evaluation/account/abc123def?tab=home');
    expect(dom.querySelectorAll('script')).toHaveLength(1);
    expect(dom.querySelector('script').src).toContain('gtag/js?id=G-YG1QD02XSE');
    expect(commands().filter(command => command[0] === 'config')).toHaveLength(1);
    expect(commands().filter(command => command[0] === 'set').at(-1)[1].page_location)
      .toBe('https://verifi.ornl.gov/data-evaluation/account/:id');
    expect(collectedEvents().map(command => command[1])).toEqual(['verifi_app_open', 'page_view', 'page_view']);
    expect(collectedEvents().at(-1)[2].page_location).toBe('https://verifi.ornl.gov/data-evaluation/account/:id');
  });

  it('pauses during navigation, blocks excluded destinations, and resumes on legacy routes', () => {
    navigate('/welcome');
    const count = collectedEvents().length;
    events.next(new NavigationStart(++navigationId, '/v1'));
    expect(browser[DISABLE_KEY]).toBe(true);
    service.sendEvent('create_account');
    events.next(new NavigationEnd(navigationId, '/v1', '/v1/data'));
    service.sendEvent('import_backup_file');
    expect(browser[DISABLE_KEY]).toBe(true);
    expect(collectedEvents()).toHaveLength(count);
    navigate('/help');
    expect(browser[DISABLE_KEY]).toBe(false);
    expect(collectedEvents().at(-1)[1]).toBe('page_view');
    expect(collectedEvents().at(-1)[2].page_referrer).toBe('');
    expect(dom.querySelectorAll('script')).toHaveLength(1);
    expect(collectedEvents().filter(command => command[1] === 'verifi_app_open')).toHaveLength(1);
  });

  it('blocks explicitly supplied excluded paths even on an eligible route', () => {
    navigate('/welcome');
    const count = collectedEvents().length;
    service.sendEvent('page_view', '/v1/data');
    service.sendEvent('page_view', '/%76%31/settings');
    expect(collectedEvents()).toHaveLength(count);
  });

  it.each(['cancel', 'error'])('restores the committed route after navigation %s without a duplicate page view', outcome => {
    navigate('/welcome');
    const count = collectedEvents().length;
    events.next(new NavigationStart(++navigationId, '/v1'));
    events.next(outcome === 'cancel'
      ? new NavigationCancel(navigationId, '/v1', 'guard', NavigationCancellationCode.GuardRejected)
      : new NavigationError(navigationId, '/v1', new Error('failed')));
    expect(browser[DISABLE_KEY]).toBe(false);
    expect(collectedEvents()).toHaveLength(count);
    service.sendEvent('create_account');
    expect(collectedEvents()).toHaveLength(count + 1);
  });

  it('stays disabled after canceling a return from an excluded route', () => {
    navigate('/v1');
    events.next(new NavigationStart(++navigationId, '/welcome'));
    events.next(new NavigationCancel(navigationId, '/welcome', 'guard', NavigationCancellationCode.GuardRejected));
    service.sendEvent('create_account');
    expect(browser[DISABLE_KEY]).toBe(true);
    expect(dom.querySelector('script')).toBeNull();
  });

  it.each([NavigationCancellationCode.Redirect, NavigationCancellationCode.SupersededByNewNavigation])('keeps redirects and superseded navigations blocked (code %s)', code => {
    navigate('/welcome');
    events.next(new NavigationStart(++navigationId, '/help'));
    const oldId = navigationId;
    events.next(new NavigationCancel(oldId, '/help', 'redirect', code));
    expect(browser[DISABLE_KEY]).toBe(true);
    events.next(new NavigationStart(++navigationId, '/v1'));
    events.next(new NavigationError(oldId, '/help', new Error('stale')));
    expect(browser[DISABLE_KEY]).toBe(true);
    events.next(new NavigationEnd(navigationId, '/v1', '/v1'));
    expect(browser[DISABLE_KEY]).toBe(true);
    expect(collectedEvents()).toHaveLength(2);
  });

  it('does not throw when the browser tag is unavailable', () => {
    navigate('/welcome');
    delete browser.gtag;
    expect(() => {
      service.sendEvent('create_account');
      navigate('/help');
    }).not.toThrow();
  });

  it('restores collection when a redirect to the current route is skipped without starting navigation', () => {
    navigate('/welcome');
    events.next(new NavigationStart(++navigationId, '/v1'));
    events.next(new NavigationCancel(navigationId, '/v1', 'redirect', NavigationCancellationCode.Redirect));
    expect(browser[DISABLE_KEY]).toBe(true);
    events.next(new NavigationSkipped(++navigationId, '/welcome', 'same URL', NavigationSkippedCode.IgnoredSameUrlNavigation));
    expect(browser[DISABLE_KEY]).toBe(false);
    expect(collectedEvents()).toHaveLength(2);
  });

  it('keeps released desktop collection and its sanitized page paths', async () => {
    electron.isElectron = true;
    browser.location.hostname = '';
    navigate('/data-evaluation/account/abc123def');
    await service.sendAnalyticsEvent('create_account', { session_id: 'test' });
    const sent = post.mock.calls.map(call => (call as any[])[1].analyticsPayload.events[0]);
    expect(sent.map(event => event.name)).toEqual(['verifi_app_open', 'page_view', 'create_account']);
    expect(sent[1].params.page_path).toBe('/data-evaluation/account/:id');
    expect(sent[1].params.page_location).toBe('https://verifi.ornl.gov/data-evaluation/account/:id');
    expect(storage.getAppAnalyticsData).toHaveBeenCalledTimes(1);
    expect(dom.querySelector('script')).toBeNull();
  });

  it('does not replay desktop events after asynchronous initialization crosses a navigation', async () => {
    electron.isElectron = true;
    const data = new Subject<any[]>();
    storage.getAppAnalyticsData.mockReturnValue(data);
    navigate('/welcome');
    const pending = service.sendAnalyticsEvent('create_account', { session_id: 'test' });
    navigate('/v1');
    data.next([{ clientId: 'existing-client' }]);
    await pending;
    expect(post).not.toHaveBeenCalled();
    navigate('/help');
    await service.sendAnalyticsEvent('import_backup_file', { session_id: 'test' });
    const names = post.mock.calls.map(call => (call as any[])[1].analyticsPayload.events[0].name);
    expect(names).toEqual(['verifi_app_open', 'page_view', 'import_backup_file']);
  });

  it('checks the desktop transport directly instead of relying on callers', async () => {
    electron.isElectron = true;
    navigate('/v1');
    service.postEventToMeasurementProtocol({ name: 'page_view', params: { page_path: '/welcome', session_id: 'test' } });
    expect(post).not.toHaveBeenCalled();
    navigate('/welcome');
    await service.sendAnalyticsEvent('create_account', { session_id: 'test' });
    post.mockClear();
    service.postEventToMeasurementProtocol({ name: 'page_view', params: { page_path: '/v1/settings', session_id: 'test' } });
    expect(post).not.toHaveBeenCalled();
  });

  it('does not open a desktop session for an explicitly excluded destination', async () => {
    electron.isElectron = true;
    navigate('/welcome');
    await service.sendAnalyticsEvent('create_account', { session_id: 'test' });
    post.mockClear();
    await service.initAnalyticsSession('/v1');
    expect(post).not.toHaveBeenCalled();
  });

  it.each([
    ['abc123def', 'xyz987stu'],
    ['9a8b7c6d5', '1z2y3x4w5']
  ])('uses the same browser analytics URLs for account %s and facility %s', (accountId, facilityId) => {
    navigate(`/data-evaluation/account/${accountId}/facility/${facilityId}?account=${accountId}#/details`);
    service.sendEvent('create_account');
    const expected = '/data-evaluation/account/:id/facility/:id';
    for (const command of collectedEvents()) {
      expect(command[2].page_path).toBe(expected);
      expect(command[2].page_location).toBe('https://verifi.ornl.gov' + expected);
    }
    navigate('/welcome');
    expect(collectedEvents().at(-1)[2].page_referrer).toBe('https://verifi.ornl.gov' + expected);
  });

  it.each([
    ['https://verifi.ornl.gov/data-evaluation/account/abc123def?account=abc123def#/details', 'https://verifi.ornl.gov/data-evaluation/account/:id'],
    ['https://example.org/account/abc123def?account=abc123def#details', 'https://example.org/account/:id'],
    ['https://verifi.ornl.gov/v1#/welcome', ''],
    ['https://verifi.ornl.gov/%76%31/settings#/welcome', '']
  ])('sanitizes the initial document referrer %s', (referrer, expected) => {
    service.ngOnDestroy();
    Object.defineProperty(dom, 'referrer', { value: referrer });
    service = new AnalyticsService(
      { post } as unknown as HttpClient,
      storage as unknown as AnalyticsDataDbService,
      electron as ElectronService,
      { events } as unknown as Router,
      dom
    );
    service.initialize();
    navigate('/welcome');
    expect(collectedEvents().at(-1)[2].page_referrer).toBe(expected);
    expect(commands().filter(command => command[0] === 'set').at(-1)[1].page_referrer).toBe(expected);
  });

  it.each(['page_view', 'create_account'] as const)('strips desktop URL IDs for %s events', async name => {
    electron.isElectron = true;
    navigate('/welcome');
    await service.sendAnalyticsEvent(name, { page_path: '/data-evaluation/account/abc123def?account=abc123def#/details', session_id: 'test' });
    const event = (post.mock.calls.at(-1) as any[])[1].analyticsPayload.events[0];
    expect(event.params.page_path).toBe('/data-evaluation/account/:id');
    expect(event.params.page_location).toBe('https://verifi.ornl.gov/data-evaluation/account/:id');
  });

  it('sanitizes an explicit desktop page location without a separate page path', async () => {
    electron.isElectron = true;
    navigate('/welcome');
    await service.sendAnalyticsEvent('create_account', {
      page_location: 'https://verifi.ornl.gov/data-evaluation/account/abc123def?account=abc123def#/details',
      session_id: 'test'
    });
    const event = (post.mock.calls.at(-1) as any[])[1].analyticsPayload.events[0];
    expect(event.params.page_path).toBe('/data-evaluation/account/:id');
    expect(event.params.page_location).toBe('https://verifi.ornl.gov/data-evaluation/account/:id');
  });

  it('rejects excluded desktop page locations even when their page path is allowed', async () => {
    electron.isElectron = true;
    navigate('/welcome');
    await service.sendAnalyticsEvent('create_account', { session_id: 'test' });
    post.mockClear();
    const params = { page_path: '/welcome', page_location: 'https://verifi.ornl.gov/v1#/welcome', session_id: 'test' };
    await service.sendAnalyticsEvent('create_account', params);
    service.postEventToMeasurementProtocol({ name: 'create_account', params });
    expect(post).not.toHaveBeenCalled();
  });
});
