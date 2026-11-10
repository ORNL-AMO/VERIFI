import { energyUseItem } from '@app/v1/data/energy-uses/energy-uses.testing';
import type { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import type { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { footprintEquipmentLinks, footprintMeterGroupError, footprintMeterGroupOptions } from './footprint-equipment-mapping';

describe('Footprint equipment meter-group mapping', () => {
  const items = [energyUseItem(), energyUseItem({ guid: 'gas-equipment', utilityData: [{ energySource: 'Natural Gas' } as never] })];
  const groups = ['electric', 'gas', 'gas-2', 'foreign', 'water'].map(guid => ({ guid, name: guid, accountId: guid === 'foreign' ? 'other' : 'account-a', facilityId: 'facility-a', groupType: guid === 'water' ? 'Water' : 'Energy' })) as IdbUtilityMeterGroup[];
  const meters = groups.map(group => ({ ...group, groupId: group.guid, source: group.guid.startsWith('gas') ? 'Natural Gas' : 'Electricity' })) as unknown as IdbUtilityMeter[];
  it('offers source-compatible owned Energy groups and rejects overlapping sources', () => {
    const options = footprintMeterGroupOptions('account-a', 'facility-a', items, groups, meters);
    expect(options.map(group => group.guid)).toEqual(['electric', 'gas', 'gas-2']);
    expect(footprintMeterGroupError(['electric', 'gas'], options)).toBeUndefined();
    expect(footprintMeterGroupError(['gas', 'gas-2'], options)).toContain('one meter group');
    expect(footprintMeterGroupError(['foreign'], options)).toContain('no longer');
  });
  it('applies each whole-group assignment only to equipment with a matching source and supports unlinking', () => {
    const options = footprintMeterGroupOptions('account-a', 'facility-a', items, groups, meters);
    expect(footprintEquipmentLinks(items[0], ['gas', 'electric'], options)).toEqual(['electric']);
    expect(footprintEquipmentLinks(items[1], ['gas', 'electric'], options)).toEqual(['gas']);
    expect(footprintEquipmentLinks(items[1], [], options)).toEqual([]);
    expect(items[0].utilityMeterGroupIds).toEqual(['meter-group-a']);
  });
});
