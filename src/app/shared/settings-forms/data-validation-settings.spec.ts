import { getNewIdbAccount } from '@data/models/idbModels/account';
import { getNewIdbFacility } from '@data/models/idbModels/facility';
import { applyDataValidationSettings, effectiveExpectedRangeSettings } from './data-validation-settings';

describe('expected-range settings', () => {
  it('defaults legacy records to enabled without rewriting them', () => {
    const account = getNewIdbAccount();
    const facility = getNewIdbFacility(account);
    delete account.expectedRangeSettings;
    delete facility.expectedRangeSettings;
    const before = structuredClone({ account, facility });
    expect(effectiveExpectedRangeSettings(account, facility)).toEqual({ enabled: true });
    expect({ account, facility }).toEqual(before);
  });

  it.each([true, false])('inherits account enabled=%s even when a stored local value differs', enabled => {
    const account = { ...getNewIdbAccount(), expectedRangeSettings: { enabled } };
    const facility = { ...getNewIdbFacility(account), expectedRangeSettings: { enabled: !enabled } };
    expect(effectiveExpectedRangeSettings(account, facility).enabled).toBe(enabled);
    facility.expectedRangeSettings = { enabled: !enabled, useAccountSettings: false } as typeof facility.expectedRangeSettings;
    expect(effectiveExpectedRangeSettings(account, facility).enabled).toBe(!enabled);
  });

  it('creates inheriting facilities and changes only the selected group', () => {
    const account = { ...getNewIdbAccount(), expectedRangeSettings: { enabled: false } };
    const facility = getNewIdbFacility(account);
    expect(facility.expectedRangeSettings).toEqual({ enabled: false, useAccountSettings: true });
    const changed = applyDataValidationSettings(facility, { group: 'expectedRange', settings: { enabled: true, useAccountSettings: false } });
    expect(changed.dataStalenessSettings).toEqual(facility.dataStalenessSettings);
    expect(facility.expectedRangeSettings?.enabled).toBe(false);
  });
});
