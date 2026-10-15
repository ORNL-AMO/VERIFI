import { reportTypeAvailable } from './report-availability';

describe('report availability from account Other Impacts', () => {
  it.each(['emissionFactors', 'accountEmissionFactors', 'betterClimate'] as const)('requires Other Impacts for %s', type => {
    expect(reportTypeAvailable(type, false)).toBe(false);
    expect(reportTypeAvailable(type, undefined)).toBe(false);
    expect(reportTypeAvailable(type, true)).toBe(true);
  });
  it.each(['analysis', 'overview', 'savings', 'modeling', 'costSavings', 'dataQuality', 'betterPlants', 'dataOverview', 'performance', 'accountSavings'] as const)('keeps %s available without Other Impacts', type => {
    expect(reportTypeAvailable(type, false)).toBe(true);
  });
});
