import { reportTypeAvailable } from './report-availability';

describe('report availability from account Other Impacts', () => {
  it.each([
    ['facility', 'emissionFactors'], ['account', 'accountEmissionFactors'], ['account', 'betterClimate']
  ] as const)('requires Other Impacts for %s %s', (scope, type) => {
    expect(reportTypeAvailable(scope, type, false)).toBe(false);
    expect(reportTypeAvailable(scope, type, undefined)).toBe(false);
    expect(reportTypeAvailable(scope, type, true)).toBe(true);
  });
  it.each([
    ['facility', 'analysis'], ['facility', 'overview'], ['facility', 'savings'], ['facility', 'modeling'],
    ['facility', 'costSavings'], ['facility', 'dataQuality'], ['account', 'betterPlants'], ['account', 'dataOverview'],
    ['account', 'performance'], ['account', 'accountSavings'], ['account', 'analysis']
  ] as const)('keeps %s %s available without Other Impacts', (scope, type) => {
    expect(reportTypeAvailable(scope, type, false)).toBe(true);
  });
});
