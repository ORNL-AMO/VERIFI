import { EnergySources, MeterSource, WaterSources } from '@data/models/constantsAndTypes';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';

export function canAssignMeterSourceToGroup(source: MeterSource, group?: IdbUtilityMeterGroup): boolean {
  if (!group) return true;
  if (group.groupType === 'Energy') return EnergySources.includes(source);
  if (group.groupType === 'Water') return WaterSources.includes(source);
  return true;
}
