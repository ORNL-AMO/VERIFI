import { IdbFacility } from '@data/models/idbModels/facility';
import { EquipmentType, EquipmentUtilityData, IdbFacilityEnergyUseEquipment, getNewIdbFacilityEnergyUseEquipment } from '@data/models/idbModels/facilityEnergyUseEquipment';
import { IdbFacilityEnergyUseGroup } from '@data/models/idbModels/facilityEnergyUseGroups';
import { ENERGY_USE_CATEGORIES, ENERGY_USE_SOURCES } from '@data/models/energy-use-options';
import { MeterSource } from '@data/models/constantsAndTypes';
import { PowerUnitOptions } from '@shared/unitOptions';
import { calculateTotalEquipmentEnergyUse } from '@domain/calculations/energy-footprint/energyFootprintCalculations';
import { getFiscalYear } from '@domain/calculations/shared-calculations/calanderizationFunctions';
import { ConflictChoices, DraftMerge, draftEqual, reconcileFields } from '@app/v1/data/editing/draft-reconciliation';

export interface EnergyUseSourceValues {
  readonly energySource: MeterSource;
  readonly size: number | null;
  readonly numberOfEquipment: number | null;
  readonly units: string;
}
export interface EnergyUseUtilitySelection {
  readonly baseline: readonly EnergyUseSourceValues[];
  readonly selected: readonly MeterSource[];
}
export interface EnergyUseMeterGroupSelection {
  readonly baseline: readonly string[];
  readonly selected: readonly string[];
  readonly utilities: EnergyUseUtilitySelection;
}
export interface EnergyUseSettingsValues {
  readonly name: string;
  readonly notes: string;
  readonly equipmentType: EquipmentType;
  readonly sources: readonly EnergyUseSourceValues[];
  readonly utilityMeterGroupIds: readonly string[];
}
export interface EnergyUseCreationDraft {
  readonly settings: EnergyUseSettingsValues;
  readonly initialYear: number;
  readonly group: { readonly kind: 'existing'; readonly guid: string } | { readonly kind: 'new'; readonly name: string };
}
export interface EnergyUseIdentity { readonly accountGuid: string; readonly facilityGuid: string; readonly energyUseGuid: string; }
export type SourceRemovalReview = EquipmentUtilityData;

export const defaultEnergyUseSource = (energySource: MeterSource = 'Electricity'): EnergyUseSourceValues => ({
  energySource, size: 0, numberOfEquipment: 1, units: 'kW'
});
export const previousEnergyUseYear = (facility: IdbFacility, now = new Date()): number => getFiscalYear(now, facility) - 1;

function sourceSettings({ energySource, size, numberOfEquipment, units }: EnergyUseSourceValues): EnergyUseSourceValues {
  return { energySource, size, numberOfEquipment, units };
}
export function energyUseSettings(item: IdbFacilityEnergyUseEquipment): EnergyUseSettingsValues {
  return normalizeEnergyUseSettings({ name: item.name ?? '', notes: item.notes ?? '', equipmentType: item.equipmentType,
    sources: item.utilityData.map(sourceSettings),
    utilityMeterGroupIds: [...(item.utilityMeterGroupIds ?? [])] });
}
export function normalizeEnergyUseSettings(value: EnergyUseSettingsValues): EnergyUseSettingsValues {
  return { name: value.name.trim(), notes: value.notes, equipmentType: value.equipmentType,
    sources: value.sources.map(sourceSettings).sort((a, b) => a.energySource.localeCompare(b.energySource)),
    utilityMeterGroupIds: [...value.utilityMeterGroupIds].sort() };
}
export function validEnergyUseSource(row: EnergyUseSourceValues): boolean {
  return ENERGY_USE_SOURCES.includes(row.energySource) && Number.isFinite(row.size) && row.size! >= 0
    && Number.isFinite(row.numberOfEquipment) && row.numberOfEquipment! >= 1 && PowerUnitOptions.some(unit => unit.value === row.units);
}
export function energyUseSettingsError(value: EnergyUseSettingsValues, base?: EnergyUseSettingsValues): string | undefined {
  if (!value.name.trim()) return 'Enter an energy use name.';
  if ((!base || value.equipmentType !== base.equipmentType) && !ENERGY_USE_CATEGORIES.includes(value.equipmentType)) return 'Choose a category.';
  if (base && draftEqual(value.sources, base.sources)) return undefined;
  if (new Set(value.sources.map(row => row.energySource)).size !== value.sources.length
    || (base && new Set(base.sources.map(row => row.energySource)).size !== base.sources.length)) {
    return 'Repeated saved source types cannot be matched safely. Other item details can still be edited.';
  }
  const additions = value.sources.filter(row => !base?.sources.some(saved => saved.energySource === row.energySource));
  if ((!base && (!value.sources.length || value.sources.length > 2)) || (additions.length && value.sources.length > 2)) return 'Choose one or two distinct sources.';
  if (value.sources.some(row => !draftEqual(row, base?.sources.find(saved => saved.energySource === row.energySource)) && !validEnergyUseSource(row))) {
    return 'Each changed source needs a finite capacity of at least zero, a quantity of at least one, and supported units.';
  }
  return undefined;
}
export function reconcileEnergyUseSettings(base: EnergyUseSettingsValues, local: EnergyUseSettingsValues,
  saved: EnergyUseSettingsValues, choices?: ConflictChoices): DraftMerge<EnergyUseSettingsValues> {
  return reconcileFields(normalizeEnergyUseSettings(base), normalizeEnergyUseSettings(local), normalizeEnergyUseSettings(saved), { choices, groups: [
    { id: 'name', label: 'Name', keys: ['name'] }, { id: 'notes', label: 'Notes', keys: ['notes'] },
    { id: 'category', label: 'Category', keys: ['equipmentType'] },
    { id: 'configuration', label: 'Sources, capacity, units, quantity, and meter links', keys: ['sources', 'utilityMeterGroupIds'] }
  ] });
}

/** Maps only Settings changes; annual history is always taken from the latest item. */
export function applyEnergyUseSettings(current: IdbFacilityEnergyUseEquipment, settings: EnergyUseSettingsValues,
  facility: IdbFacility, reviews: readonly SourceRemovalReview[] = [], recalculate = true): IdbFacilityEnergyUseEquipment {
  const value = normalizeEnergyUseSettings(settings), base = energyUseSettings(current);
  const error = energyUseSettingsError(value, base);
  if (error) throw new Error(error);
  const updated = structuredClone(current);
  updated.name = value.name; updated.notes = value.notes; updated.equipmentType = value.equipmentType;
  updated.utilityMeterGroupIds = [...value.utilityMeterGroupIds];
  if (draftEqual(value.sources, base.sources)) return updated;
  const removed = current.utilityData.filter(row => !value.sources.some(source => source.energySource === row.energySource));
  if (removed.some(row => !reviews.some(review => draftEqual(review, row)))) throw new Error('Saved source history changed. Review the source removal again before saving.');
  const rows = current.utilityData.filter(row => value.sources.some(source => source.energySource === row.energySource));
  const additions = value.sources.filter(row => !rows.some(source => source.energySource === row.energySource));
  updated.utilityData = [...rows.map(row => structuredClone(row)), ...additions.map(row => ({ ...row,
    energyUse: current.operatingConditionsData.map(conditions => ({ year: conditions.year, energyUse: 0,
      overrideEnergyUse: false, energyUseUnit: facility.energyUnit })) } as EquipmentUtilityData))];
  for (const row of updated.utilityData) {
    const source = value.sources.find(source => source.energySource === row.energySource)!;
    const before = base.sources.find(source => source.energySource === row.energySource);
    if (draftEqual(source, before)) continue;
    Object.assign(row, source);
    if (!recalculate) continue;
    for (const annual of row.energyUse) {
      if (annual.overrideEnergyUse) continue;
      const conditions = current.operatingConditionsData.filter(value => value.year === annual.year);
      if (conditions.length !== 1) throw new Error(`Cannot calculate ${row.energySource} for ${annual.year}: operating assumptions are missing or repeated.`);
      const input = conditions[0];
      if (![input.hoursOfOperation, input.loadFactor, input.dutyFactor, input.efficiency].every(Number.isFinite)
        || input.hoursOfOperation < 0 || input.loadFactor < 0 || input.loadFactor > 115 || input.dutyFactor < 0 || input.dutyFactor > 100
        || input.efficiency < 0 || input.efficiency > 100 || (row.energySource === 'Electricity' && input.efficiency === 0)) {
        throw new Error(`Cannot calculate ${row.energySource} for ${annual.year}: check its saved operating assumptions.`);
      }
      const result = calculateTotalEquipmentEnergyUse(input, row, annual.energyUseUnit);
      if (!Number.isFinite(result)) throw new Error(`Cannot calculate ${row.energySource} for ${annual.year} in its saved units.`);
      annual.energyUse = result;
    }
  }
  return updated;
}

export function createEnergyUse(draft: EnergyUseCreationDraft, group: IdbFacilityEnergyUseGroup, facility: IdbFacility): IdbFacilityEnergyUseEquipment {
  if (!Number.isInteger(draft.initialYear) || draft.initialYear < 1 || draft.initialYear > 9999) throw new Error('Enter a valid initial year.');
  const error = energyUseSettingsError(draft.settings);
  if (error) throw new Error(error);
  return applyEnergyUseSettings(getNewIdbFacilityEnergyUseEquipment(group, draft.initialYear), draft.settings, facility);
}
