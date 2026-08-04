import { IdbFacility } from 'src/app/models/idbModels/facility';
import { getFacilityDataManagementUrl } from './header-navigation';

describe('getFacilityDataManagementUrl', () => {
  it('falls back to the account page when no facility survives an account switch', () => {
    expect(getFacilityDataManagementUrl('account-b', undefined))
      .toBe('/data-management/account-b');
  });

  it('keeps facility navigation when the active account has a selected facility', () => {
    const selectedFacility = {
      guid: 'facility-b',
      accountId: 'account-b'
    } as IdbFacility;

    expect(getFacilityDataManagementUrl('account-b', selectedFacility))
      .toBe('/data-management/account-b/facilities/facility-b');
  });
});
