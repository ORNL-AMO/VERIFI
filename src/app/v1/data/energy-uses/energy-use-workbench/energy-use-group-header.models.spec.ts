import { buildEnergyUseGroups } from '../inventory/energy-use-group.models';
import { buildEnergyUseInventory } from '../inventory/energy-use-inventory.models';
import { energyUseFacility, energyUseGroup, energyUseItem, energyUseSource } from '../energy-uses.testing';
import { energyUseGroupHeader } from './energy-use-group-header.models';

function header(items = [energyUseItem()]) {
  const facility = energyUseFacility(), group = energyUseGroup();
  const entries = buildEnergyUseInventory('account-a', [facility], items, [group]);
  return energyUseGroupHeader(buildEnergyUseGroups('account-a', [facility], [group], entries)[0]);
}

describe('committed Energy Use group header', () => {
  it('includes distinct sources from all members and reports validation for an unselected invalid member', () => {
    const conditions = [{ year: 2024, hoursOfOperation: 1000, loadFactor: 100, dutyFactor: 100, efficiency: 100 }];
    const items = [energyUseItem({ operatingConditionsData: conditions }), energyUseItem({ guid: 'other', name: 'Other', operatingConditionsData: conditions, utilityData: [energyUseSource({ energySource: 'Natural Gas' })] })];
    const before = JSON.stringify(items);
    expect(header(items).sources.map(source => source.name)).toEqual(['Electricity', 'Natural Gas']);
    expect(header(items).validation.label).toBe('Valid');
    const invalid = [...items, energyUseItem({ guid: 'incomplete', name: 'Incomplete', utilityData: [] })];
    expect(header(invalid).validation).toMatchObject({ label: 'Needs review', tone: 'warning', description: expect.stringContaining('Incomplete') });
    expect(JSON.stringify(items)).toBe(before);
  });
  it('retains empty and unavailable group states without reporting valid data', () => {
    expect(header([]).validation.label).toBe('No energy uses');
    expect(energyUseGroupHeader(undefined).validation.label).toBe('Group unavailable');
  });
});
