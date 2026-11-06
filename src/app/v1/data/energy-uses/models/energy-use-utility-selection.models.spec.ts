import type { MeterSource } from '@data/models/constantsAndTypes';
import type { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { getNewIdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { defaultEnergyUseSource, EnergyUseMeterGroupSelection } from './energy-use-settings.models';
import { EnergyUseUtilitySelectionContext, manualUtilityMeterGroups, meterGroupSelectionCurrent, meterGroupSelectionError, meterGroupSelectionUnchanged, meterGroupUtilities } from './energy-use-utility-selection.models';

describe('Energy Use utility selection policy', () => {
  function setup(): EnergyUseUtilitySelectionContext {
    const definitions: readonly [string, MeterSource][] = [['electric-a', 'Electricity'], ['electric-b', 'Electricity'], ['gas', 'Natural Gas'], ['other', 'Other Energy'], ['water', 'Water Intake']];
    return {
      owner: { accountGuid: 'account-a', facilityGuid: 'facility-a' }, sources: [defaultEnergyUseSource()], linkedIds: [],
      groups: definitions.map(([guid]) => ({ ...getNewIdbUtilityMeterGroup('Energy', guid, 'facility-a', 'account-a'), guid })),
      meters: definitions.map(([groupId, source]) => ({ guid: `${groupId}-meter`, accountId: 'account-a', facilityId: 'facility-a', groupId, source } as IdbUtilityMeter))
    };
  }

  function selection(context: EnergyUseUtilitySelectionContext, ids: readonly string[]): EnergyUseMeterGroupSelection {
    return { baseline: context.linkedIds, selected: ids, utilities: { baseline: context.sources, selected: meterGroupUtilities(context, ids) } };
  }

  it.each([
    [['electric-a', 'gas'], undefined],
    [['electric-a', 'electric-b'], 'cannot share an energy source'],
    [['missing'], 'Choose available Energy meter groups'],
    [['water'], 'unsupported energy-use utility'],
    [['electric-a', 'gas', 'other'], 'no more than two utilities']
  ] as const)('validates candidate groups %j', (ids, error) => {
    const context = setup();
    const result = meterGroupSelectionError(context, ids);
    if (error) expect(result).toContain(error);
    else expect(result).toBeUndefined();
  });

  it.each(['accountId', 'facilityId'] as const)('rejects a group with foreign %s', key => {
    const context = setup();
    const foreign = { ...context, groups: context.groups.map(group => group.guid === 'gas' ? { ...group, [key]: 'foreign' } : group) };
    expect(meterGroupSelectionError(foreign, ['gas'])).toContain('Choose available Energy meter groups');
    expect(meterGroupSelectionCurrent(foreign, selection(foreign, ['gas']))).toBe(false);
  });

  it('retains only compatible links that supply the complete manual selection without mutating the review', () => {
    const original = setup();
    const context = { ...original, sources: [defaultEnergyUseSource(), defaultEnergyUseSource('Natural Gas')], linkedIds: ['electric-a', 'gas'] };
    const utilities = { baseline: context.sources, selected: ['Electricity'] as const };
    const before = structuredClone(context);
    expect(manualUtilityMeterGroups(context, utilities)).toEqual({ baseline: ['electric-a', 'gas'], selected: ['electric-a'], utilities });
    expect(manualUtilityMeterGroups(context, { ...utilities, selected: ['Other Energy'] })).toMatchObject({ selected: [] });
    expect(manualUtilityMeterGroups(context, { ...utilities, selected: ['Electricity', 'Natural Gas'] })).toBeUndefined();
    expect(context).toEqual(before);
  });

  it('unlinks unavailable and foreign links during an actual utility change', () => {
    const context = setup();
    const value = { ...context, sources: [defaultEnergyUseSource(), defaultEnergyUseSource('Natural Gas')], linkedIds: ['missing', 'electric-a', 'gas'],
      groups: context.groups.map(group => group.guid === 'gas' ? { ...group, facilityId: 'foreign' } : group) };
    expect(manualUtilityMeterGroups(value, { baseline: value.sources, selected: ['Natural Gas'] })).toMatchObject({ selected: [] });
  });

  it('allows an unchanged legacy overlap to close without allowing that invalid selection as a change', () => {
    const context = { ...setup(), linkedIds: ['electric-a', 'electric-b'] };
    expect(meterGroupSelectionError(context, context.linkedIds)).toContain('cannot share');
    expect(meterGroupSelectionUnchanged(context, context.linkedIds)).toBe(true);
    expect(meterGroupSelectionCurrent(context, selection(context, context.linkedIds))).toBe(true);
    expect(meterGroupSelectionCurrent({ ...context, linkedIds: [] }, selection({ ...context, linkedIds: [] }, context.linkedIds))).toBe(false);
  });

  it('preserves existing extra sources while preventing additions beyond the supported creation limit', () => {
    const context = { ...setup(), sources: [defaultEnergyUseSource(), defaultEnergyUseSource('Natural Gas'), defaultEnergyUseSource('Other Energy')], linkedIds: ['electric-a', 'gas', 'other'] };
    expect(meterGroupSelectionError(context, context.linkedIds)).toBeUndefined();
    expect(meterGroupSelectionCurrent(context, selection(context, context.linkedIds))).toBe(true);
  });

  it('rejects stale source, link, or meter-derived utility snapshots', () => {
    const context = setup();
    const reviewed = selection(context, ['gas']);
    expect(meterGroupSelectionCurrent(context, reviewed)).toBe(true);
    expect(meterGroupSelectionCurrent({ ...context, linkedIds: ['electric-a'] }, reviewed)).toBe(false);
    expect(meterGroupSelectionCurrent({ ...context, sources: [{ ...context.sources[0], size: 20 }] }, reviewed)).toBe(false);
    expect(meterGroupSelectionCurrent({ ...context, meters: context.meters.map(meter => meter.groupId === 'gas' ? { ...meter, source: 'Electricity' } : meter) }, reviewed)).toBe(false);
  });
});
