import type { CalanderizedMeter } from '@data/models/calanderization';
import type { IdbFacility } from '@data/models/idbModels/facility';
import type { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { ConvertValue } from '@domain/calculations/conversions/convertValue';
import { getFiscalYear } from '@domain/calculations/shared-calculations/calanderizationFunctions';
import { getIsEnergyMeter, getIsEnergyUnit } from '@shared/sharedHelperFunctions';
import { energyUseFiscalPeriod } from './energy-use-projection.models';
import type { FacilityEnergyUseResult } from './facility-energy-use-results.models';

export interface FacilityEnergyUseSourceBalance {
  readonly source: string;
  readonly consumption: number | null;
  readonly equipment: number;
  readonly unaccounted: number | null;
  readonly accountedPercent: number | null;
  readonly complete: boolean;
  readonly equipmentPartial: boolean;
  readonly coverage: string;
}
export interface FacilityEnergyUseBalance {
  readonly consumption: number | null;
  readonly equipment: number;
  readonly unaccounted: number | null;
  readonly accountedPercent: number | null;
  readonly complete: boolean;
  readonly sources: readonly FacilityEnergyUseSourceBalance[];
}

function includedMeters(meters: readonly CalanderizedMeter[], facility: IdbFacility): readonly CalanderizedMeter[] {
  return meters.filter(row => row.meter.accountId === facility.accountId && row.meter.facilityId === facility.guid
    && row.meter.includeInEnergy && getIsEnergyMeter(row.meter.source));
}

function remainingConsumption(consumption: number, equipment: number): number {
  const difference = consumption - equipment;
  return Math.abs(difference) <= Number.EPSILON * 16 * Math.max(1, Math.abs(consumption), equipment) ? 0 : difference;
}

/** Input is canonical site-energy calendarization; never compare source energy to equipment site energy. */
export function buildFacilityEnergyUseBalance(facility: IdbFacility, year: number, meters: readonly CalanderizedMeter[], readings: readonly IdbUtilityMeterData[], equipment?: FacilityEnergyUseResult): FacilityEnergyUseBalance {
  const owned = includedMeters(meters, facility);
  const period = energyUseFiscalPeriod(facility, year);
  const start = period ? new Date(`${period.key.slice(0, 10)}T00:00:00`) : undefined;
  const months = start ? Array.from({ length: 12 }, (_, index) => new Date(start.getFullYear(), start.getMonth() + index, 1)) : [];
  const meterRows = owned.flatMap(row => {
    const saved = readings.filter(reading => reading.meterId === row.meter.guid && reading.accountId === facility.accountId && reading.facilityId === facility.guid);
    if (saved.length && months.length && saved.every(reading => new Date(reading.year, reading.month - 1, 1) > months[11])) return [];
    const retire = row.meter.noLongerInUse && Number.isInteger(row.meter.noLongerInUseYear) && Number.isInteger(row.meter.noLongerInUseMonth)
      ? new Date(row.meter.noLongerInUseYear, row.meter.noLongerInUseMonth + 1, 1) : undefined;
    const expected = months.filter(date => !retire || date < retire);
    if (!expected.length) return [];
    const selected = row.monthlyData.filter(month => getFiscalYear(new Date(month.date), facility) === year);
    let known = 0, amount = 0;
    for (const date of expected) {
      const entries = selected.filter(month => { const value = new Date(month.date); return value.getFullYear() === date.getFullYear() && value.getMonth() === date.getMonth(); });
      if (entries.length !== 1 || row.energyIsSource || !Number.isFinite(entries[0].energyUse) || !hasSavedCoverage(row, saved, date)) continue;
      const value = new ConvertValue(entries[0].energyUse, row.energyUnit, facility.energyUnit);
      if (value.hasError || !Number.isFinite(value.convertedValue)) continue;
      amount += value.convertedValue; known++;
    }
    return [{ source: row.meter.source, amount: known ? amount : null, known, expected: expected.length }];
  });
  const sourceNames = [...new Set([...meterRows.map(row => row.source), ...(equipment?.sources.map(row => row.source) ?? [])])].sort();
  const sources = sourceNames.map(source => {
    const rows = meterRows.filter(row => row.source === source);
    const use = equipment?.sources.find(row => row.source === source);
    const consumption = rows.some(row => row.amount !== null) ? rows.reduce((sum, row) => sum + (row.amount ?? 0), 0) : null;
    const complete = rows.length > 0 && rows.every(row => row.known === row.expected);
    const equipmentAmount = use?.total ?? 0;
    const known = rows.reduce((sum, row) => sum + row.known, 0), expected = rows.reduce((sum, row) => sum + row.expected, 0);
    return { source, consumption, equipment: equipmentAmount, complete, equipmentPartial: use?.partial ?? false,
      unaccounted: complete && consumption !== null ? remainingConsumption(consumption, equipmentAmount) : null,
      accountedPercent: complete && consumption !== null && consumption > 0 ? equipmentAmount / consumption * 100 : null,
      coverage: complete ? '' : rows.length ? `Incomplete utility data: ${known} of ${expected} meter-months available for this fiscal year.` : 'No included energy meter for this source.' };
  });
  const consumption = sources.some(row => row.consumption !== null) ? sources.reduce((sum, row) => sum + (row.consumption ?? 0), 0) : null;
  const complete = sources.length > 0 && sources.every(row => row.complete);
  const equipmentAmount = equipment?.total ?? 0;
  return { sources, consumption, equipment: equipmentAmount, complete,
    unaccounted: complete && consumption !== null ? remainingConsumption(consumption, equipmentAmount) : null,
    accountedPercent: complete && consumption !== null && consumption > 0 ? equipmentAmount / consumption * 100 : null };
}

/** Prefer the latest complete bill year; an incomplete current year must not displace it. */
export function facilityEnergyBalanceYear(meters: readonly CalanderizedMeter[], facility: IdbFacility, readings: readonly IdbUtilityMeterData[]): number | undefined {
  const owned = includedMeters(meters, facility);
  const years = [...new Set(owned.flatMap(row => row.monthlyData.map(month => getFiscalYear(new Date(month.date), facility))))]
    .filter(year => Number.isInteger(year) && year >= 1 && year <= 9999).sort((a, b) => a - b);
  return years.filter(year => buildFacilityEnergyUseBalance(facility, year, owned, readings).complete).at(-1) ?? years.at(-1);
}

/** Calendarization may pad missing months with zero; only saved reading coverage makes them known. */
function hasSavedCoverage(row: CalanderizedMeter, readings: readonly IdbUtilityMeterData[], date: Date): boolean {
  const valid = (reading: IdbUtilityMeterData) => Number.isFinite(getIsEnergyUnit(row.meter.startingUnit) ? reading.totalEnergyUse : reading.totalVolume);
  const mode = row.meter.meterReadingDataApplication ?? 'backward';
  if (mode === 'fullYear') {
    const annual = readings.filter(reading => reading.year === date.getFullYear());
    return annual.length > 0 && annual.every(valid);
  }
  if (mode === 'fullMonth') {
    const monthly = readings.filter(reading => reading.year === date.getFullYear() && reading.month === date.getMonth() + 1);
    return monthly.length > 0 && monthly.every(valid);
  }
  const next = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  const dated = readings.filter(valid).map(reading => new Date(reading.year, reading.month - 1, reading.day));
  return dated.some(value => value <= date) && dated.some(value => value >= next)
    && readings.filter(reading => { const value = new Date(reading.year, reading.month - 1, reading.day); return value >= date && value < next; }).every(valid);
}
