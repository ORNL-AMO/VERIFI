import { analyticsRoutePath, isAnalyticsRouteAllowed } from './analytics-policy';
import { environment as local } from 'src/environments/environment';
import { environment as devServer } from 'src/environments/environment.dev-srv';
import { environment as production } from 'src/environments/environment.prod';
import { environment as electron } from 'src/environments/environment.electron';

describe('analytics deployment policy', () => {
  it.each([
    ['local', local, false],
    ['dev/QA', devServer, false],
    ['published web', production, true],
    ['released Electron', electron, true]
  ] as const)('sets analytics eligibility for %s', (_name, configuration, enabled) => {
    expect(configuration.analyticsEnabled).toBe(enabled);
  });
});

describe('analytics route policy', () => {
  it.each([
    '/v1', '/v1/', '/v1/data/meters', '/v1?tab=home', '/v1#overview',
    '/v1/settings', '/v1;mode=preview', '/%76%31/data', '/v1(aux:help)',
    '#/v1/data', 'file:///app/index.html#/v1?tab=home',
    'https://verifi.ornl.gov/v1/data?tab=home#details', '/account/v1/data',
    '/v1#/welcome', '/v1/data?tab=home#/welcome',
    'https://verifi.ornl.gov/v1#/welcome'
  ])('excludes the route %s', path => {
    expect(isAnalyticsRouteAllowed(path)).toBe(false);
  });

  it.each(['/welcome', '/', '/v10', '/workspace-v1', '/help/v1-guide', '/help?return=/v1', '/help#v1', '/welcome#/v1', 'https://verifi.ornl.gov/welcome#/v1/settings'])('allows the legacy route %s', path => {
    expect(isAnalyticsRouteAllowed(path)).toBe(true);
  });

  it('normalizes Electron routes without retaining query strings or fragments', () => {
    expect(analyticsRoutePath('file:///app/index.html#/data-evaluation/account?tab=home#details'))
      .toBe('/data-evaluation/account');
  });

  it.each([
    ['/v1#/welcome', '/v1'],
    ['https://verifi.ornl.gov/v1#/welcome', '/v1'],
    ['https://verifi.ornl.gov/account/abc123def#/welcome', '/account/abc123def'],
    ['#/account/abc123def?tab=home#details', '/account/abc123def'],
    ['file:///app/index.html#/account/abc123def?tab=home#details', '/account/abc123def']
  ])('normalizes %s according to its routing mode', (url, expected) => {
    expect(analyticsRoutePath(url)).toBe(expected);
  });

  it('fails closed for malformed paths', () => {
    expect(isAnalyticsRouteAllowed('/%invalid')).toBe(false);
  });
});
