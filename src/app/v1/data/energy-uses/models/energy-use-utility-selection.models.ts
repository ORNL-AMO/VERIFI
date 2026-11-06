import type { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import type { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { ENERGY_USE_SOURCES } from '@data/models/energy-use-options';
import { EnergyUseOwner, energyUseLinkedSources, energyUseMeterLinksError } from '@data/account-workspace/handlers/energy-use-command.models';
import { draftEqual } from '@app/v1/data/editing/draft-reconciliation';
import { EnergyUseMeterGroupSelection, EnergyUseSourceValues, EnergyUseUtilitySelection, defaultEnergyUseSource } from './energy-use-settings.models';

/** Current form values and committed lookup data; this policy never mutates either. */
export interface EnergyUseUtilitySelectionContext {
  readonly owner: EnergyUseOwner;
  readonly sources: readonly EnergyUseSourceValues[];
  readonly linkedIds: readonly string[];
  readonly groups: readonly IdbUtilityMeterGroup[];
  readonly meters: readonly IdbUtilityMeter[];
}

export function meterGroupUtilities(context: EnergyUseUtilitySelectionContext, ids: readonly string[]) {
  return energyUseLinkedSources(context.owner, ids, context.meters);
}

export function meterGroupSelectionUnchanged(context: EnergyUseUtilitySelectionContext, ids: readonly string[]): boolean {
  const unchangedLinks = draftEqual([...ids].sort(), [...context.linkedIds].sort());
  const unchangedUtilities = draftEqual(context.sources.map(source => source.energySource).sort(), [...meterGroupUtilities(context, ids)].sort());
  return unchangedLinks && (!ids.length || unchangedUtilities);
}

/** New selections must be valid; unchanged legacy selections can be dismissed without rewriting them. */
export function meterGroupSelectionError(context: EnergyUseUtilitySelectionContext, ids: readonly string[]): string | undefined {
  const sources = meterGroupUtilities(context, ids);
  const additions = sources.filter(source => !context.sources.some(row => row.energySource === source));
  if (additions.some(source => !ENERGY_USE_SOURCES.includes(source))) return 'This meter group contains an unsupported energy-use utility.';
  if (additions.length && sources.length > 2) return 'Select meter groups supplying no more than two utilities.';
  return energyUseMeterLinksError({
    accountId: context.owner.accountGuid,
    facilityId: context.owner.facilityGuid,
    utilityMeterGroupIds: [...ids],
    utilityData: sources.map(source => ({ ...(context.sources.find(row => row.energySource === source) ?? defaultEnergyUseSource(source)), energyUse: [] }))
  }, context.groups, context.meters);
}

export function meterGroupSelectionCurrent(context: EnergyUseUtilitySelectionContext, selection: EnergyUseMeterGroupSelection): boolean {
  if (!draftEqual(selection.baseline, context.linkedIds) || !draftEqual(selection.utilities.baseline, context.sources)) return false;
  const sources = meterGroupUtilities(context, selection.selected);
  if (!draftEqual([...sources].sort(), [...selection.utilities.selected].sort())) return false;
  return meterGroupSelectionUnchanged(context, selection.selected) || !meterGroupSelectionError(context, selection.selected);
}

/** Keep compatible links only when they still supply the complete manually selected utility set. */
export function manualUtilityMeterGroups(context: EnergyUseUtilitySelectionContext, utilities: EnergyUseUtilitySelection): EnergyUseMeterGroupSelection | undefined {
  if (!context.linkedIds.length || draftEqual(utilities.baseline.map(source => source.energySource).sort(), [...utilities.selected].sort())) return undefined;
  const compatible = context.linkedIds.filter(guid => {
    const group = context.groups.find(group => group.guid === guid && group.accountId === context.owner.accountGuid
      && group.facilityId === context.owner.facilityGuid && group.groupType === 'Energy');
    const sources = meterGroupUtilities(context, [guid]);
    return group && sources.length && sources.every(source => utilities.selected.includes(source));
  });
  const sources = meterGroupUtilities(context, compatible);
  const selected = draftEqual([...sources].sort(), [...utilities.selected].sort()) ? compatible : [];
  return { baseline: [...context.linkedIds], selected, utilities: structuredClone(utilities) };
}
