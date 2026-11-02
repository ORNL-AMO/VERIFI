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
    '/p1', '/p1/settings', '/p1;mode=preview', '/%76%31/data', '/v1(aux:help)',
    '#/v1/data', 'file:///app/index.html#/p1?tab=home',
    'https://verifi.ornl.gov/v1/data?tab=home#details', '/account/v1/data'
  ])('excludes the route %s', path => {
    expect(isAnalyticsRouteAllowed(path)).toBe(false);
  });

  it.each(['/welcome', '/', '/v10', '/p10', '/help/v1-guide', '/help?return=/v1', '/help#v1'])('allows the legacy route %s', path => {
    expect(isAnalyticsRouteAllowed(path)).toBe(true);
  });

  it('normalizes Electron routes without retaining query strings or fragments', () => {
    expect(analyticsRoutePath('file:///app/index.html#/data-evaluation/account?tab=home#details'))
      .toBe('/data-evaluation/account');
  });

  it('fails closed for malformed paths', () => {
    expect(isAnalyticsRouteAllowed('/%invalid')).toBe(false);
  });
});
