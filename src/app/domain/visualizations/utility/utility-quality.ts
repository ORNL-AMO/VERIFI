import type { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import type { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { buildCalendarizationSummaries } from '@domain/calculations/calanderization/calendarizationExample';
import { getIsEnergyUnit } from '@shared/sharedHelperFunctions';
import { ConvertValue } from '@domain/calculations/conversions/convertValue';
import { civilDate, monthRange, validCivil } from './utility-periods';
import type { UtilityVisualizationSource } from '../visualization-definition';
import type { VisualizationObservation } from '../visualization-source-provider';

export function readingCivil(reading: IdbUtilityMeterData): string { return `${String(reading.year).padStart(4, '0')}-${String(reading.month).padStart(2, '0')}-${String(reading.day).padStart(2, '0')}`; }
export function utilityInputField(source: UtilityVisualizationSource, meter: IdbUtilityMeter): 'totalCost' | 'totalEnergyUse' | 'totalVolume' {
  if (source.measure.endsWith('emissions') && (meter.source === 'Other' && [5, 6].includes(meter.scope)
    || meter.source === 'Other Fuels' && meter.scope === 2)) return 'totalVolume';
  return source.measure === 'cost' ? 'totalCost' : source.measure === 'consumption' && !['Electricity'].includes(meter.source)
    && !(getIsEnergyUnit(meter.startingUnit) && meter.scope !== 2) ? 'totalVolume' : 'totalEnergyUse';
}

/** A finite calendarized value cannot establish that an earlier saved-unit conversion succeeded. */
export function utilityInputUnitError(source: UtilityVisualizationSource, meter: IdbUtilityMeter, projectedUnit?: string): string | undefined {
  if (source.measure === 'cost' || source.measure === 'charge') return undefined;
  const field = utilityInputField(source, meter);
  const volumeEmissions = source.measure.endsWith('emissions') && field === 'totalVolume';
  const mobile = meter.source === 'Other Fuels' && meter.scope === 2;
  const mobileConsumption = source.measure.endsWith('emissions') ? meter.vehicleCategory !== 2 || meter.vehicleCollectionType === 1 : meter.vehicleCollectionType === 1;
  const savedUnit = field === 'totalEnergyUse' ? meter.energyUnit : mobile ? mobileConsumption ? meter.vehicleCollectionUnit : meter.vehicleDistanceUnit : meter.startingUnit;
  const canonicalUnit = field === 'totalEnergyUse' ? 'MMBtu' : volumeEmissions ? mobile ? mobileConsumption ? 'gal' : 'mi' : 'kg' : projectedUnit ?? savedUnit;
  if (!savedUnit || !canonicalUnit) return 'Missing saved unit for the required utility input.';
  const convert = (target: string) => {
    const conversion = new ConvertValue(1, savedUnit, target);
    return !conversion.hasError && Number.isFinite(conversion.convertedValue);
  };
  if (!convert(canonicalUnit) || projectedUnit && !source.measure.endsWith('emissions') && !convert(projectedUnit))
    return `Invalid or incompatible saved ${savedUnit} unit; conversion to ${projectedUnit ?? canonicalUnit} cannot be verified.`;
  return undefined;
}
export function unavailableObservation(reason: string, state: 'missing' | 'excluded' | 'alignment-padding' = 'missing'): VisualizationObservation { return { state, value: null, reason }; }

/** Prove which saved bills feed a value. Unknown allocation is unavailable, never a synthetic zero. */
export function calendarizedObservation(meter: IdbUtilityMeter, readings: readonly IdbUtilityMeterData[], source: UtilityVisualizationSource,
  year: number, month: number, value: number | undefined,
  allocation?: ReturnType<typeof buildCalendarizationSummaries>): VisualizationObservation {
  const bounds = monthRange(year, month);
  if (meter.noLongerInUse && Number.isInteger(meter.noLongerInUseYear) && Number.isInteger(meter.noLongerInUseMonth)) {
    const retiredEnd = monthRange(meter.noLongerInUseYear, meter.noLongerInUseMonth).end;
    if (bounds.start > retiredEnd) return unavailableObservation('Retired: no observation expected after retirement.', 'excluded');
  }
  if (!readings.length) return unavailableObservation('Missing saved meter readings.');
  if (readings.some(r => !validCivil(readingCivil(r)))) return unavailableObservation('Invalid saved bill date; allocation cannot be verified.');
  const ordered = [...readings].sort((a, b) => readingCivil(a).localeCompare(readingCivil(b)) || a.guid.localeCompare(b.guid));
  if (new Set(ordered.map(readingCivil)).size !== ordered.length) return unavailableObservation('Duplicate bill dates; allocation cannot be verified.');
  let contributing: readonly IdbUtilityMeterData[];
  const method = meter.meterReadingDataApplication ?? 'fullMonth';
  if (method === 'fullMonth') contributing = ordered.filter(r => r.year === year && r.month === month + 1);
  else if (method === 'fullYear') contributing = ordered.filter(r => r.year === year);
  else {
    if (ordered.length < 4) return unavailableObservation('Backward calendarization requires at least four saved readings.');
    const summaries = allocation ?? buildCalendarizationSummaries(meter, ordered, 'backward');
    const summary = summaries.find(s => civilDate(s.calanderizedMonth).slice(0, 7) === bounds.start.slice(0, 7));
    // The help illustration's readingIndex is intentionally limited to four markers.
    // Canonical summary dates identify contributions across the complete saved history.
    const byDate = new Map(ordered.map(reading => [readingCivil(reading), reading]));
    if (!summary?.monthReadingSummaries.length || summary.monthReadingSummaries.some(s => !byDate.has(civilDate(s.readDate)) || !Number.isFinite(s.daysApplied)))
      return unavailableObservation('Billing allocation cannot be verified from existing canonical evidence.');
    contributing = [...new Set(summary.monthReadingSummaries.filter(s => s.daysApplied > 0).map(s => byDate.get(civilDate(s.readDate))!))];
  }
  if (!contributing.length) return unavailableObservation('Missing saved observations for this period.');
  const unitError = utilityInputUnitError(source, meter);
  if (unitError) return unavailableObservation(unitError);
  const field = utilityInputField(source, meter);
  if (contributing.some(r => typeof r[field] !== 'number' || !Number.isFinite(r[field]))) return unavailableObservation(`Invalid or missing ${field}; normalized calculation values are unavailable.`);
  if (method === 'fullMonth' && contributing.length > 1) return unavailableObservation('Duplicate monthly bills; review saved data before aggregating.');
  if (!Number.isFinite(value)) return unavailableObservation('Authoritative calculation is unavailable or invalid.');
  return { state: 'observed', value: value!, provenance: contributing.some(r => r.isEstimated) ? 'estimated' : 'measured', partial: false };
}

export function aggregateUtilityObservations(values: readonly VisualizationObservation[]): VisualizationObservation {
  const observed = values.filter((v): v is Extract<VisualizationObservation, { state: 'observed' }> => v.state === 'observed');
  if (!observed.length) return unavailableObservation([...new Set(values.map(v => v.state === 'observed' ? '' : v.reason))].join(' ') || 'No valid contributions.',
    values.length && values.every(v => v.state === 'excluded') ? 'excluded' : 'missing');
  return { state: 'observed', value: observed.reduce((sum, v) => sum + v.value, 0),
    provenance: observed.some(v => v.provenance === 'estimated') ? 'estimated' : 'measured',
    partial: observed.some(v => v.partial) || values.some(v => v.state !== 'observed' && v.state !== 'excluded') };
}
