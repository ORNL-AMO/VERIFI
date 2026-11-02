import { getNewIdbAccount } from '@data/models/idbModels/account';
import { getNewIdbFacility } from '@data/models/idbModels/facility';
import { applyAccountSettingsChange, applyFacilitySettingsChange, facilitySettingsChange } from './facility-settings.models';

describe('facility settings changes', () => {
  it('captures only the edited group, retaining empty and optional profile values', () => {
    const account = getNewIdbAccount();
    const facility = { ...getNewIdbFacility(account), name: 'Edited facility', zip: undefined, notes: '', classification: 'Office' as const };
    const change = facilitySettingsChange('profile', facility);

    expect(change).toEqual({ group: 'profile', values: {
      name: facility.name, country: facility.country, city: facility.city, state: facility.state,
      zip: undefined, address: facility.address, naics1: facility.naics1, naics2: facility.naics2, naics3: facility.naics3,
      notes: '', color: facility.color, contactName: facility.contactName, contactEmail: facility.contactEmail,
      contactPhone: facility.contactPhone, size: facility.size, classification: 'Office'
    } });
    expect(change.values).not.toHaveProperty('guid');
    expect(change.values).not.toHaveProperty('energyUnit');
    const updatedAccount = applyAccountSettingsChange({ ...account, size: 123 }, change);
    expect(updatedAccount.name).toBe('Edited facility');
    expect(updatedAccount.size).toBe(123);
    expect(updatedAccount).not.toHaveProperty('classification');
  });

  it('owns separate goal values for the captured edit, account and facility', () => {
    const account = { ...getNewIdbAccount(), displayEmissions: true, isBetterPlantsPartner: true };
    const facility = { ...getNewIdbFacility(account), isNewFacility: true };
    const change = facilitySettingsChange('goals', facility);
    const updatedAccount = applyAccountSettingsChange(account, change);
    const updatedFacility = applyFacilitySettingsChange(facility, change);
    facility.sustainabilityQuestions.energyReductionPercent = 75;
    updatedFacility.sustainabilityQuestions.energyReductionPercent = 50;

    expect(updatedAccount.sustainabilityQuestions.energyReductionPercent).toBe(25);
    expect(change.values).toMatchObject({ sustainabilityQuestions: { energyReductionPercent: 25 } });
    expect(updatedAccount.displayEmissions).toBe(true);
    expect(updatedAccount.isBetterPlantsPartner).toBe(true);
    expect(updatedAccount).not.toHaveProperty('isNewFacility');
    expect(updatedFacility.isNewFacility).toBe(true);
  });

  it('does not apply extra identity or unrelated properties hidden in a typed change', () => {
    const account = getNewIdbAccount();
    const facility = getNewIdbFacility(account);
    const change = { group: 'financial' as const, values: {
      fiscalYear: 'nonCalendarYear' as const, fiscalYearMonth: 6, fiscalYearCalendarEnd: false,
      guid: 'replacement', accountId: 'other-account', energyUnit: 'GJ'
    } };

    expect(applyAccountSettingsChange(account, change)).toEqual({ ...account, fiscalYear: 'nonCalendarYear', fiscalYearMonth: 6, fiscalYearCalendarEnd: false });
    expect(applyFacilitySettingsChange(facility, change)).toEqual({ ...facility, fiscalYear: 'nonCalendarYear', fiscalYearMonth: 6, fiscalYearCalendarEnd: false });
  });
});
