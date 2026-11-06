import type { MeterSource } from '@data/models/constantsAndTypes';
import type { IdbFacilityEnergyUseEquipment } from '@data/models/idbModels/facilityEnergyUseEquipment';
import { energyUseSettings, normalizeEnergyUseSettings } from './energy-use-settings.models';
import type { EnergyUseSettingsValues, EnergyUseSourceValues } from './energy-use-settings.models';

/** Editable Setup inputs; calculated saved amounts are excluded from draft equality. */
export interface AnnualConditionsValues {
  readonly year: number;
  readonly hoursOfOperation: number | null;
  readonly loadFactor: number | null;
  readonly dutyFactor: number | null;
  readonly efficiency: number | null;
  readonly hoursPerDay?: number | null;
  readonly daysPerWeek?: number | null;
  readonly weeksPerYear?: number | null;
}
export interface AnnualConsumptionValues {
  readonly year: number;
  /** Only manual amounts are editable. Calculated saved amounts remain on the record. */
  readonly energyUse: number | null;
  readonly overrideEnergyUse: boolean;
  readonly energyUseUnit: string;
  /** A new copied row preserves its saved amount until its calculation inputs change. Never persisted. */
  readonly copy?: {
    readonly amount: number;
    readonly conditions: AnnualConditionsValues;
    readonly source: EnergyUseSourceValues;
    readonly energyUseUnit: string;
  };
}
export interface AnnualSourceValues {
  readonly energySource: MeterSource;
  readonly entries: readonly AnnualConsumptionValues[];
}
export interface EnergyUseSetupValues extends EnergyUseSettingsValues {
  readonly conditions: readonly AnnualConditionsValues[];
  readonly consumption: readonly AnnualSourceValues[];
}
export function energyUseSetup(item: IdbFacilityEnergyUseEquipment): EnergyUseSetupValues {
  return normalizeEnergyUseSetup({
    ...energyUseSettings(item),
    conditions: item.operatingConditionsData,
    consumption: item.utilityData.map(source => ({ energySource: source.energySource, entries: source.energyUse }))
  });
}

export function normalizeEnergyUseSetup(value: EnergyUseSetupValues): EnergyUseSetupValues {
  return {
    ...normalizeEnergyUseSettings(value),
    conditions: value.conditions.map(normalizeAnnualConditions),
    consumption: value.consumption.map(source => ({
      energySource: source.energySource,
      entries: source.entries.map(row => ({
        year: row.year,
        energyUse: row.overrideEnergyUse ? row.energyUse : null,
        overrideEnergyUse: row.overrideEnergyUse,
        energyUseUnit: row.energyUseUnit,
        ...(row.copy ? { copy: structuredClone(row.copy) } : {})
      }))
    }))
  };
}

export function normalizeAnnualConditions(row: AnnualConditionsValues): AnnualConditionsValues {
  return {
    year: row.year,
    hoursOfOperation: row.hoursOfOperation,
    loadFactor: row.loadFactor,
    dutyFactor: row.dutyFactor,
    efficiency: row.efficiency,
    ...(row.hoursPerDay != null ? { hoursPerDay: row.hoursPerDay } : {}),
    ...(row.daysPerWeek != null ? { daysPerWeek: row.daysPerWeek } : {}),
    ...(row.weeksPerYear != null ? { weeksPerYear: row.weeksPerYear } : {})
  };
}

export function energyUseYears(value: EnergyUseSetupValues): number[] {
  const years = [...value.conditions.map(row => row.year), ...value.consumption.flatMap(source => source.entries.map(row => row.year))];
  return [...new Set(years)].sort((a, b) => a - b);
}
