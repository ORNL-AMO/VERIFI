import { draftEqual } from '@app/v1/data/editing/draft-reconciliation';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbFacilityEnergyUseEquipment } from '@data/models/idbModels/facilityEnergyUseEquipment';
import { EnergyUseBatchChange } from '@data/account-workspace/handlers/energy-use-command.models';
import { AnnualConsumptionValues, EnergyUseSetupValues, applyEnergyUseSetup, energyUseConsumptionAmount, energyUseSetup, energyUseSetupValidation, energyUseYears, normalizeEnergyUseSetup } from './energy-use-setup.models';
import { previousEnergyUseYear } from './energy-use-settings.models';

export function nextEnergyUseYear(items: readonly IdbFacilityEnergyUseEquipment[], facility: IdbFacility): number {
  const years = items.flatMap(item => energyUseYears(energyUseSetup(item))).filter(year => Number.isInteger(year) && year >= 1 && year <= 9999);
  return years.length ? Math.max(...years) + 1 : previousEnergyUseYear(facility);
}

/** Detached annual-only drafts. Never repairs or mutates the original record. */
export function seedEnergyUseYear(item: IdbFacilityEnergyUseEquipment, facility: IdbFacility, year: number): {
  value: EnergyUseSetupValues; existing: boolean; sourceYear?: number;
} {
  if (!Number.isInteger(year) || year < 1 || year > 9999) throw new Error('Enter a fiscal year from 1 to 9999.');
  const base = energyUseSetup(item);
  const repeated = <T>(rows: readonly T[], key: (row: T) => string | number) => new Set(rows.map(key)).size !== rows.length;
  if (repeated(base.sources, row => row.energySource) || repeated(base.consumption, row => row.energySource)
    || repeated(base.conditions, row => row.year) || base.consumption.some(source => repeated(source.entries, row => row.year))) {
    throw new Error('Repeated source types or annual rows need review in the item editor before adding year data.');
  }
  const years = energyUseYears(base).filter(value => Number.isInteger(value) && value >= 1 && value <= 9999);
  const existing = years.includes(year), sourceYear = existing ? year : years.at(-1);
  const savedConditions = base.conditions.find(row => row.year === sourceYear);
  const conditions = { ...savedConditions, year, hoursOfOperation: savedConditions?.hoursOfOperation ?? 8760,
    loadFactor: savedConditions?.loadFactor ?? 100, dutyFactor: savedConditions?.dutyFactor ?? 100, efficiency: savedConditions?.efficiency ?? 100 };
  const consumption = base.sources.map(source => {
    const entries = base.consumption.find(row => row.energySource === source.energySource)?.entries ?? [];
    const from = entries.find(row => row.year === sourceYear);
    let row: AnnualConsumptionValues = from ? { ...structuredClone(from), year }
      : { year, energyUse: null, overrideEnergyUse: false, energyUseUnit: facility.energyUnit };
    if (!existing && from && !from.overrideEnergyUse) {
      // Preserve copied calculated amounts until the inputs actually change, as in Copy Year.
      try {
        const amount = energyUseConsumptionAmount(base, item, source.energySource, from);
        if (amount !== null && Number.isFinite(amount) && amount >= 0) row = { ...row, copy: { amount, conditions: structuredClone(conditions), source: structuredClone(source), energyUseUnit: row.energyUseUnit } };
      } catch { /* Missing prior assumptions can be completed in this new draft. */ }
    }
    return { energySource: source.energySource, entries: entries.some(entry => entry.year === year)
      ? entries.map(entry => entry.year === year ? row : entry) : [...entries, row] };
  });
  return { value: { ...base, conditions: base.conditions.some(row => row.year === year)
    ? base.conditions.map(row => row.year === year ? conditions : row) : [...base.conditions, conditions], consumption }, existing, sourceYear };
}

export function energyUseYearChange(item: IdbFacilityEnergyUseEquipment, facility: IdbFacility, value: EnergyUseSetupValues, year: number): EnergyUseBatchChange {
  value = normalizeEnergyUseSetup(value);
  const base = energyUseSetup(item);
  const withoutYear = (input: EnergyUseSetupValues) => ({ ...input, conditions: input.conditions.filter(row => row.year !== year),
    consumption: input.consumption.map(source => ({ ...source, entries: source.entries.filter(row => row.year !== year) })) });
  if (!draftEqual(withoutYear(value), withoutYear(base))) throw new Error('This workflow can only change the selected fiscal year.');
  // Validate the reviewed year even if a user accepts unchanged, invalid imported values.
  const selected = { ...value, conditions: value.conditions.filter(row => row.year === year),
    consumption: value.consumption.map(source => ({ ...source, entries: source.entries.filter(row => row.year === year) })) };
  const status = energyUseSetupValidation(selected, item);
  if (status.tone === 'warning') throw new Error(status.description);
  const after = applyEnergyUseSetup(item, value, facility);
  for (const source of value.sources) {
    const row = selected.consumption.find(entry => entry.energySource === source.energySource)?.entries[0];
    if (!row) throw new Error(`Enter consumption for ${source.energySource}.`);
    const amount = energyUseConsumptionAmount(value, item, source.energySource, row);
    if (amount === null || !Number.isFinite(amount) || amount < 0) throw new Error(`Enter valid ${source.energySource} consumption.`);
  }
  return { facility, before: item, after };
}
