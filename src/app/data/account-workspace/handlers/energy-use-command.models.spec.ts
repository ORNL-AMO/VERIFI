import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { getNewIdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { energyUseLinkedSources, energyUseMeterLinksError } from './energy-use-command.models';

describe('Energy Use meter-group contracts', () => {
  const owner = { accountGuid: 'account-a', facilityGuid: 'facility-a' };
  const groups = ['electric-a', 'electric-b', 'gas-a'].map(guid => ({ ...getNewIdbUtilityMeterGroup('Energy', guid, owner.facilityGuid, owner.accountGuid), guid }));
  const meters = groups.map(group => ({ guid: `${group.guid}-meter`, accountId: owner.accountGuid, facilityId: owner.facilityGuid,
    groupId: group.guid, source: group.guid === 'gas-a' ? 'Natural Gas' : 'Electricity' } as IdbUtilityMeter));
  const item = (ids: string[], sources = energyUseLinkedSources(owner, ids, meters)) => ({
    accountId: owner.accountGuid, facilityId: owner.facilityGuid, utilityMeterGroupIds: ids,
    utilityData: sources.map(energySource => ({ energySource, size: 0, numberOfEquipment: 1, units: 'kW', energyUse: [] }))
  });
  it('derives distinct utilities from owned meter records without readings', () => {
    expect(energyUseLinkedSources(owner, ['electric-a', 'gas-a'], [...meters,
      { ...meters[0], guid: 'second-electric-meter' }, { ...meters[0], accountId: 'another-account', source: 'Other Energy' }])).toEqual(['Electricity', 'Natural Gas']);
  });
  it('rejects two groups supplying the same utility but allows different utilities', () => {
    expect(energyUseMeterLinksError(item(['electric-a', 'electric-b']), groups, meters)).toContain('cannot share');
    expect(energyUseMeterLinksError(item(['electric-a', 'gas-a']), groups, meters)).toBeUndefined();
  });
  it('rejects configured utilities outside the selected meter groups', () => {
    expect(energyUseMeterLinksError(item(['gas-a'], ['Electricity', 'Natural Gas']), groups, meters)).toContain('must match');
  });
});
