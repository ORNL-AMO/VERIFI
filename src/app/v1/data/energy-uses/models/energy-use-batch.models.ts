import { EnergyUseBatchChange } from '@data/account-workspace/handlers/energy-use-command.models';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbFacilityEnergyUseEquipment } from '@data/models/idbModels/facilityEnergyUseEquipment';
import { addEnergyUseYear, applyEnergyUseSetup, energyUseSetup, energyUseYears, removeEnergyUseYear, reviewEnergyUseYear } from './energy-use-setup.models';

export type EnergyUseBatchOperation = { readonly kind: 'delete' }
  | { readonly kind: 'add' | 'remove'; readonly year: number }
  | { readonly kind: 'copy'; readonly year: number; readonly fromYear: number };
export interface EnergyUseBatchRow {
  readonly item: IdbFacilityEnergyUseEquipment; readonly facility?: IdbFacility;
  readonly change?: EnergyUseBatchChange; readonly skipped?: string; readonly error?: string;
  readonly years: readonly number[]; readonly sources: readonly string[];
}
export function reviewEnergyUseBatch(items: readonly IdbFacilityEnergyUseEquipment[], facilities: readonly IdbFacility[], operation: EnergyUseBatchOperation): EnergyUseBatchRow[] {
  return items.map(saved => {
    const item = structuredClone(saved), facility = facilities.find(owner => owner.guid === item.facilityId && owner.accountId === item.accountId);
    const base = { item, facility, years: energyUseYears(energyUseSetup(item)), sources: item.utilityData.map(source => source.energySource) };
    if (!facility) return { ...base, error: 'The owning facility is unavailable.' };
    if (operation.kind === 'delete') return { ...base, change: { facility: structuredClone(facility), before: item } };
    if (!Number.isInteger(operation.year) || operation.year < 1 || operation.year > 9999) return { ...base, error: 'Enter a fiscal year from 1 to 9999.' };
    if (operation.kind !== 'remove' && base.years.includes(operation.year)) return { ...base, skipped: 'Destination year already exists; saved values will remain.' };
    if (operation.kind === 'remove' && !base.years.includes(operation.year)) return { ...base, skipped: 'No saved entries for this year.' };
    try {
      const value = energyUseSetup(item);
      const next = operation.kind === 'remove' ? removeEnergyUseYear(value, operation.year)
        : addEnergyUseYear(value, operation.year, facility, operation.kind === 'copy' ? { year: operation.fromYear, item } : undefined);
      const after = applyEnergyUseSetup(item, next, facility, operation.kind === 'remove' ? { years: [reviewEnergyUseYear(item, operation.year)] } : {});
      return { ...base, change: { facility: structuredClone(facility), before: item, after } };
    } catch (error) { return { ...base, error: error instanceof Error ? error.message : 'This item cannot be changed safely.' }; }
  });
}
