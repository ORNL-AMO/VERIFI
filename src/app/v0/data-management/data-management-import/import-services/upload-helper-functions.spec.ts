import { getCountryCode, getState } from '@v0/data-management/data-management-import/import-services/upload-helper-functions';

describe('upload helper functions', () => {
  it('normalizes country names and codes to stored country codes', () => {
    expect(getCountryCode('United States of America (the)')).toBe('US');
    expect(getCountryCode('US')).toBe('US');
    expect(getCountryCode('usa')).toBe('US');
    expect(getCountryCode(' united states of america (the) ')).toBe('US');
  });

  it('normalizes state abbreviations and names to template state names', () => {
    expect(getState('TN')).toBe('TENNESSEE');
    expect(getState('Tennessee')).toBe('TENNESSEE');
    expect(getState('TENNESSEE')).toBe('TENNESSEE');
    expect(getState(' tn ')).toBe('TENNESSEE');
  });
});
