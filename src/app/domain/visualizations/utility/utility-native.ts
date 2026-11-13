import type { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import type { IdbAccount } from '@data/models/idbModels/account';
import type { IdbFacility } from '@data/models/idbModels/facility';
import type { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import type { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import type { SubregionEmissions } from '@data/models/eGridEmissions';
import { getChargeTypes } from '@data/models/meter-charges-options';
import { getUnitFromMeter } from '@domain/calculations/calanderization/calanderizationHelpers';
import { ConvertValue } from '@domain/calculations/conversions/convertValue';
import { getEmissions } from '@domain/calculations/emissions-calculations/emissions';
import { checkShowSiteToSource, getIsEnergyMeter, getIsEnergyUnit } from '@shared/sharedHelperFunctions';
import type { UtilityVisualizationSource } from '../visualization-definition';
import type {
  ResolvedVisualizationSeries, VisualizationObservation, VisualizationSourceRequest, VisualizationSourceResolution
} from '../visualization-source-provider';
import { utilityChartSupport } from './utility-capabilities';
import { monthRange, resolveUtilityRanges, validCivil } from './utility-periods';
import { readingCivil, unavailableObservation, utilityInputField } from './utility-quality';
import { resolveUtilitySelection, utilityMeasureKey, utilityOwner, utilitySeriesId } from './utility-selection';
import { recordedChargeUsageUnit } from './utility-charge-semantics';
import { utilityEmissionsInputError } from './native/emissions-inputs';

interface NativeMeasure {
  readonly unit: string;
  readonly dimension: string;
  readonly additive: boolean;
  readonly currency?: string;
  readonly energyTreatment?: 'site' | 'source';
  readonly label: string;
  readonly value: (reading: IdbUtilityMeterData) => VisualizationObservation;
}

/** Native bills are dated occurrences. Their date is not invented monthly coverage or a shared billing interval. */
export function resolveNativeUtility(snapshot: AccountWorkspaceSnapshot, request: VisualizationSourceRequest,
  emissionsRates?: readonly SubregionEmissions[]): VisualizationSourceResolution {
  const identity = request.identity;
  const unsupported = (message: string): VisualizationSourceResolution => ({ identity, state: 'unsupported', message });
  if (snapshot.account.guid !== identity.accountGuid || request.source.id !== identity.sourceId) return unsupported('The native utility request belongs to a different account or source identity.');
  if (request.source.kind !== 'utility') return unsupported('Choose a utility source for native bill observations.');
  const source = request.source;
  const support = utilityChartSupport(source, request.chart);
  if (source.dataMode !== 'billing-period' || support.state !== 'supported') return unsupported(support.state === 'unsupported'
    ? support.reasons.join(' ') : 'Choose native billing observations.');
  if (request.comparison.kind !== 'none') return unsupported('Native bills cannot be aligned to a previous or custom comparison period. Use calendarized data for comparisons.');
  if (!source.selection || source.selection.kind === 'fixed' && !source.selection.guids.length) return unsupported('Select a meter before previewing native bills.');
  const selected = resolveUtilitySelection(snapshot, identity.scope, source);
  if (selected.missing.length) return { identity, state: 'missing-source', references: selected.missing, message: 'Repair the selected meter, group, facility or named charge before previewing.' };
  const owner = utilityOwner(snapshot, identity.scope);
  if (!owner) return unsupported('The owning utility settings are unavailable.');
  if (selected.meters.length > 1) return unsupported('Native bills from different meters have independent billing periods. Select one meter, or use calendarized data for aligned comparisons.');
  if (!selected.meters.length) return { identity, state: 'empty', periods: [], message: 'No meters match this saved selection.' };
  const meter = selected.meters[0];
  if (snapshot.meterData.some(reading => reading.meterId === meter.guid
    && (reading.accountId !== snapshot.account.guid || reading.facilityId !== meter.facilityId))) return unsupported('A saved bill contradicts its meter ownership. Correct the saved data before previewing.');
  const readings = snapshot.meterData.filter(reading => reading.meterId === meter.guid && reading.accountId === snapshot.account.guid && reading.facilityId === meter.facilityId)
    .sort((left, right) => readingCivil(left).localeCompare(readingCivil(right)) || left.guid.localeCompare(right.guid));
  if (readings.some(reading => !validCivil(readingCivil(reading)))) return unsupported('A selected bill has an invalid date. Correct it before using native observations.');
  if (new Set(readings.map(reading => reading.guid)).size !== readings.length) return unsupported('Duplicate bill identities prevent a faithful native series. Correct the saved bills first.');
  try {
    const measure = nativeMeasure(snapshot, source, meter, owner, emissionsRates ?? snapshot.customEmissions);
    const history = readings.length ? { start: readingCivil(readings[0]), end: readingCivil(readings[readings.length - 1]) } : undefined;
    const ranges = resolveUtilityRanges(request.period, request.comparison, owner, request.dateContext, history);
    const periods = ranges.map(range => ({ ...range, interval: 'billing-period' as const, facilityGuid: identity.scope.kind === 'facility' ? meter.facilityId : undefined }));
    const inPeriod = readings.filter(reading => ranges.some(range => range.start <= readingCivil(reading) && range.end >= readingCivil(reading)));
    if (!inPeriod.length) return { identity, state: 'empty', periods, message: 'No saved bill occurrences fall within the resolved dates.' };
    const duplicateDates = new Set(readings.filter((reading, index) => index > 0 && readingCivil(reading) === readingCivil(readings[index - 1])).map(readingCivil));
    const warnings = new Set<string>(['Native bill observations are positioned at their saved bill dates. Bill duration is not inferred or prorated.']);
    const id = utilitySeriesId(source.id, meter.guid);
    const metadata: ResolvedVisualizationSeries = { id, sourceId: source.id, metric: utilityMeasureKey(source), resourceGuid: meter.guid,
      label: `${meter.name} / ${measure.label}`, unit: measure.unit, dimension: measure.dimension, additive: measure.additive,
      ...(measure.currency ? { currency: measure.currency } : {}), ...(measure.energyTreatment ? { energyTreatment: measure.energyTreatment } : {}),
      contributionKeys: inPeriod.map(reading => `${meter.guid}:${reading.guid}:${utilityMeasureKey(source)}`) };
    const rows = inPeriod.map(reading => {
      const date = readingCivil(reading);
      const invalidNegative = !meter.canBeNegative && !['cost', 'charge'].includes(source.measure)
        && reading[utilityInputField(source, meter)] < 0;
      let observation = duplicateDates.has(date) ? unavailableObservation('Duplicate bill dates: the occurrence is retained but its value is unavailable.')
        : invalidNegative ? unavailableObservation('Negative usage is invalid for this meter; review its saved data or settings.') : measure.value(reading);
      if (meter.noLongerInUse && Number.isInteger(meter.noLongerInUseYear) && Number.isInteger(meter.noLongerInUseMonth)) {
        warnings.add('This meter is retired; historical observations retain their original dates.');
        if (date > monthRange(meter.noLongerInUseYear, meter.noLongerInUseMonth).end) observation = unavailableObservation('Excluded: saved bill occurs after meter retirement.', 'excluded');
      }
      if (observation.state !== 'observed') warnings.add(`${date}: ${observation.reason}`);
      return { periodKey: `${meter.guid}:${reading.guid}`, start: date, end: date, role: 'primary' as const, values: { [id]: observation } };
    });
    const provenance = [...new Set(rows.flatMap(row => Object.values(row.values).flatMap(observation => observation.state === 'observed' ? [observation.provenance] : [])))];
    return { identity, state: 'ready', resolved: { data: { kind: 'time-series', rows }, alignment: { kind: 'billing-occurrence', key: `meter:${meter.guid}:bill-guid` },
      series: [metadata], periods, references: selected.references, provenance,
      quality: { partial: rows.some(row => Object.values(row.values).some(observation => observation.state !== 'observed' && observation.state !== 'excluded')), warnings: [...warnings] } } };
  } catch (error) {
    return unsupported(error instanceof Error ? error.message : 'These native measure settings are unavailable.');
  }
}

function nativeMeasure(snapshot: AccountWorkspaceSnapshot, source: UtilityVisualizationSource, meter: IdbUtilityMeter,
  owner: IdbAccount | IdbFacility, emissionsRates: readonly SubregionEmissions[]): NativeMeasure {
  const pinned = source.settings?.unit?.kind === 'pinned' ? source.settings.unit.value : undefined;
  const treatment = source.settings?.energyTreatment?.kind === 'pinned' ? source.settings.energyTreatment.value : owner.energyIsSource ? 'source' : 'site';
  const observed = (reading: IdbUtilityMeterData, value: unknown): VisualizationObservation => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return unavailableObservation('Invalid or missing recorded value.');
    return { state: 'observed', value, provenance: reading.isEstimated ? 'estimated' : 'measured', partial: false };
  };
  const convert = (value: unknown, from: string, to: string): number | undefined => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
    const conversion = new ConvertValue(value, from, to);
    return !conversion.hasError && Number.isFinite(conversion.convertedValue) ? conversion.convertedValue : undefined;
  };
  const requireUnit = (from: string, to: string): string => {
    if (!from || !to || convert(1, from, to) === undefined) throw new Error(`Cannot convert native ${from || 'unknown'} values to ${to || 'an unspecified unit'}. Choose compatible units.`);
    return to;
  };
  const energyEligible = meter.source === 'Other' ? getIsEnergyUnit(meter.startingUnit) : getIsEnergyMeter(meter.source);
  if (source.measure === 'cost') {
    if (pinned && pinned !== 'USD') throw new Error('Native bill costs use USD; currency conversion is unavailable.');
    return { unit: 'USD', dimension: 'currency', currency: 'USD', additive: true, label: 'Bill cost', value: reading => observed(reading, reading.totalCost) };
  }
  if (source.measure === 'charge') {
    if (!source.charge) throw new Error('Select a named meter charge.');
    const charge = meter.charges?.find(item => item.guid === source.charge!.chargeGuid);
    if (!charge) throw new Error('The named charge is unavailable.');
    if (!getChargeTypes(meter.source).some(type => type.value === charge.chargeType)) throw new Error('This saved charge type is not supported for the meter utility source. Review the meter charge settings.');
    const cost = source.charge.measure === 'cost';
    const unit = cost ? 'USD' : recordedChargeUsageUnit(charge, meter);
    if (!unit) throw new Error('This charge has no authoritative physical usage or demand unit. Choose its recorded amount instead.');
    if (pinned && pinned !== unit) throw new Error('Native named charges retain their recorded currency or usage unit. Choose Follow owner to retain charge meaning.');
    const demand = ['demand', 'demandMDQ'].includes(charge.chargeType);
    return { unit, dimension: cost ? 'currency' : demand ? 'demand' : `charge-usage:${unit}`, ...(cost ? { currency: 'USD' } : {}),
      additive: cost || !demand, label: `${charge.name} / ${cost ? 'Recorded amount' : demand ? 'Recorded demand' : 'Recorded usage'}`,
      value: reading => {
        const values = reading.charges?.filter(item => item.chargeGuid === charge.guid) ?? [];
        if (values.length !== 1) return unavailableObservation(values.length > 1 ? 'Duplicate charge entries in this bill.' : 'This bill has no recorded value for the named charge.');
        return observed(reading, cost ? values[0].chargeAmount : values[0].chargeUsage);
      } };
  }
  if (source.measure === 'energy') {
    if (!energyEligible) throw new Error('This utility does not expose an authoritative energy measure. Choose consumption or cost.');
    const unit = requireUnit(meter.energyUnit, pinned ?? owner.energyUnit);
    const applies = treatment === 'source' && checkShowSiteToSource(meter.source, meter.includeInEnergy, meter.scope);
    if (applies && (!Number.isFinite(meter.siteToSource) || meter.siteToSource <= 0)) throw new Error('The meter has no valid site-to-source multiplier.');
    return { unit, dimension: 'energy', additive: true, energyTreatment: treatment, label: `${treatment === 'source' ? 'Source' : 'Site'} energy`,
      value: reading => {
        const value = convert(reading.totalEnergyUse, meter.energyUnit, unit);
        return observed(reading, value === undefined ? undefined : applies ? value * meter.siteToSource : value);
      } };
  }
  if (source.measure === 'consumption') {
    const energyInput = getIsEnergyUnit(meter.startingUnit) && meter.scope !== 2;
    const from = energyInput ? meter.energyUnit : meter.source === 'Other Fuels' && meter.scope === 2
      ? meter.vehicleCollectionType === 1 ? meter.vehicleCollectionUnit : meter.vehicleDistanceUnit : meter.startingUnit;
    const unit = requireUnit(from, pinned ?? getUnitFromMeter(meter, owner));
    const dimension = new ConvertValue(1, from, unit).origin.measure as string;
    return { unit, dimension: `consumption:${dimension}`, additive: true, label: 'Recorded consumption',
      value: reading => observed(reading, convert(energyInput ? reading.totalEnergyUse : reading.totalVolume, from, unit)) };
  }
  if (pinned && pinned !== 'tonne CO2e') throw new Error('Emissions retain canonical tonne CO2e units.');
  if (!energyEligible && !(meter.source === 'Other' && [5, 6].includes(meter.scope))) throw new Error('Emissions are unavailable for this utility source.');
  return { unit: 'tonne CO2e', dimension: 'emissions', additive: true,
    label: source.measure === 'location-emissions' ? 'Location-based emissions' : 'Market-based emissions',
    value: reading => {
      const invalid = utilityEmissionsInputError(snapshot, meter, [reading], {
        measure: source.measure === 'market-emissions' ? 'market-emissions' : 'location-emissions', year: reading.year, emissionsRates });
      if (invalid) return unavailableObservation(invalid);
      const needsVolume = meter.source === 'Other' || meter.source === 'Other Fuels' && meter.scope === 2;
      if (needsVolume ? typeof reading.totalVolume !== 'number' || !Number.isFinite(reading.totalVolume)
        : typeof reading.totalEnergyUse !== 'number' || !Number.isFinite(reading.totalEnergyUse)) return unavailableObservation('Missing or invalid saved emissions inputs.');
      try {
        const result = getEmissions(meter, reading.totalEnergyUse, meter.energyUnit, reading.year, false,
          [...snapshot.facilities], [...emissionsRates], [...snapshot.customFuels], reading.totalVolume,
          meter.vehicleCollectionUnit, meter.vehicleDistanceUnit, meter.scope === 2 ? reading.vehicleFuelEfficiency : reading.heatCapacity,
          snapshot.account.assessmentReportVersion, [...snapshot.customGWPs]);
        const value = source.measure === 'location-emissions' ? result.totalWithLocationEmissions : result.totalWithMarketEmissions;
        return Number.isFinite(value) ? observed(reading, value) : unavailableObservation('Authoritative emissions calculation is unavailable or invalid for this bill.');
      } catch {
        return unavailableObservation('Authoritative emissions calculation is unavailable for this bill.');
      }
    } };
}
