import { visualizationSnapshot } from '../testing/visualization-test-fixtures';
import { meter } from '@app/v1/data/meters/facility-meters.testing';
import { meterResourceChoices } from './utility-items';

describe('utility resource ownership labels', () => {
  it('distinguishes an unnamed portfolio facility from an unavailable facility for same-named meters', () => {
    const base = visualizationSnapshot();
    const snapshot = { ...base, meterData: [], facilities: base.facilities.map(facility => ({ ...facility, name: '' })),
      meters: [meter({ name: 'Main' }), meter({ guid: 'meter-b', facilityId: 'missing-facility', name: 'Main', noLongerInUse: true })] };
    const choices = meterResourceChoices(snapshot, { kind: 'portfolio', facilityGuids: ['facility-a', 'missing-facility'] }, 'meter');
    expect(choices.map(choice => choice.label)).toEqual(['Main', 'Main']);
    expect(choices.map(choice => choice.detail)).toEqual([
      'Unnamed facility · Electricity · No usable readings yet',
      'Unavailable facility · Electricity · Retired · No usable readings yet'
    ]);
  });
});
