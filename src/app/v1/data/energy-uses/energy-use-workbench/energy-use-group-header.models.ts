import type { MeterSource } from '@data/models/constantsAndTypes';
import { UtilityColors } from '@shared/utilityColors';
import type { EnergyUseGroupEntry } from '../inventory/energy-use-group.models';
import { energyUseSetup, energyUseSetupValidation } from '../models/energy-use-setup.models';

/** Committed group summary, independent of the selected member or results tab. */
export function energyUseGroupHeader(group: EnergyUseGroupEntry | undefined) {
  const sources = [...new Set(group?.items.flatMap(entry => entry.item.utilityData.map(source => source.energySource)) ?? [])]
    .sort().map(name => ({ name, color: Object.hasOwn(UtilityColors, name) ? UtilityColors[name as MeterSource]?.color : undefined }));
  const reviews = group?.items.flatMap(entry => {
    const validation = energyUseSetupValidation(energyUseSetup(entry.item), entry.item);
    return validation.tone === 'warning' ? [`${entry.name}: ${validation.description}`] : [];
  }) ?? [];
  const validation = !group || group.unavailable
    ? { label: 'Group unavailable', tone: 'warning' as const, icon: 'warning' as const, description: 'The saved energy-use group is unavailable.' }
    : !group.items.length
      ? { label: 'No energy uses', tone: 'info' as const, icon: 'info' as const, description: 'Add an energy use to begin configuring this group.' }
      : reviews.length
        ? { label: 'Needs review', tone: 'warning' as const, icon: 'warning' as const, description: reviews.join(' ') }
        : { label: 'Valid', tone: 'success' as const, icon: 'success' as const, description: 'All energy uses in this group pass Setup validation.' };
  return { sources, validation };
}
