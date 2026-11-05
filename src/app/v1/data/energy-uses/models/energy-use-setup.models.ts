import { IdbFacility } from '@data/models/idbModels/facility';
import { MeterSource } from '@data/models/constantsAndTypes';
import { EnergyEquipmentOperatingConditionsData, EquipmentUtilityDataEnergyUse, IdbFacilityEnergyUseEquipment } from '@data/models/idbModels/facilityEnergyUseEquipment';
import { calculateTotalEquipmentEnergyUse } from '@domain/calculations/energy-footprint/energyFootprintCalculations';
import { footprintEnergyUseUnits } from '@domain/calculations/energy-footprint/energy-footprint-units';
import { ConflictChoices, DraftMerge, draftEqual, reconcileFields, reconcileKeyedItems } from '@app/v1/data/editing/draft-reconciliation';
import { EnergyUseSettingsValues, EnergyUseSourceValues, SourceRemovalReview, applyEnergyUseSettings, energyUseSettings, energyUseSettingsError, normalizeEnergyUseSettings, reconcileEnergyUseSettings, validEnergyUseSource } from './energy-use-settings.models';

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
  readonly copy?: { readonly amount: number; readonly conditions: AnnualConditionsValues; readonly source: EnergyUseSourceValues; readonly energyUseUnit: string };
}
export interface AnnualSourceValues {
  readonly energySource: MeterSource;
  readonly entries: readonly AnnualConsumptionValues[];
}
export interface EnergyUseSetupValues extends EnergyUseSettingsValues {
  readonly conditions: readonly AnnualConditionsValues[];
  readonly consumption: readonly AnnualSourceValues[];
}
export interface EnergyUseSetupValidation {
  readonly label: string;
  readonly tone: 'success' | 'warning';
  readonly icon: 'success' | 'warning';
  readonly description: string;
}

/** Readiness of the current Setup inputs, without recalculating or repairing saved history. */
export function energyUseSetupValidation(value: EnergyUseSetupValues, saved?: IdbFacilityEnergyUseEquipment): EnergyUseSetupValidation {
  const messages: string[] = [];
  const years = energyUseYears(value);
  if (!value.name.trim()) messages.push('Enter an energy use name.');
  if (!value.sources.length) messages.push('Select a utility to configure consumption.');
  if (!years.length) messages.push('Add a fiscal year to enter annual data.');
  if (!unique(value.sources, row => row.energySource) || !unique(value.consumption, row => row.energySource)) messages.push('Repeated source types need review.');
  if (!unique(value.conditions, row => row.year)) messages.push('Repeated operating years need review.');
  for (const source of value.sources) {
    if (!validEnergyUseSource(source)) messages.push(`Check capacity, quantity, and units for ${source.energySource}.`);
  }
  for (const year of years) {
    if (!Number.isInteger(year) || year < 1 || year > 9999) messages.push('Fiscal years must be from 1 to 9999.');
    const conditions = value.conditions.filter(row => row.year === year);
    if (conditions.length !== 1) messages.push(`Operating assumptions for ${year} are missing or repeated.`);
    else {
      const error = conditionsError(conditions[0], value.sources.some(source => source.energySource === 'Electricity'));
      if (error) messages.push(error);
    }
    for (const source of value.sources) {
      const rows = value.consumption.filter(row => row.energySource === source.energySource);
      const entries = rows.length === 1 ? rows[0].entries.filter(row => row.year === year) : [];
      if (entries.length !== 1) { messages.push(`${source.energySource} consumption for ${year} is missing or repeated.`); continue; }
      const row = entries[0];
      if (!footprintEnergyUseUnits.includes(row.energyUseUnit)) messages.push(`Check ${source.energySource} consumption units for ${year}.`);
      const savedRows = saved?.utilityData.filter(savedSource => savedSource.energySource === source.energySource) ?? [];
      const savedEntries = savedRows.length === 1 ? savedRows[0].energyUse.filter(entry => entry.year === year) : [];
      const amount = row.overrideEnergyUse ? row.energyUse : savedEntries[0]?.energyUse;
      if ((row.overrideEnergyUse || amount !== undefined) && (!Number.isFinite(amount) || amount! < 0)) messages.push(`Check ${source.energySource} consumption for ${year}.`);
    }
  }
  const label = !value.sources.length ? 'No sources configured' : !years.length ? 'No annual data' : messages.length ? 'Needs review' : 'Setup valid';
  return { label, tone: messages.length ? 'warning' : 'success', icon: messages.length ? 'warning' : 'success',
    description: messages.length ? [...new Set(messages)].join(' ') : 'Equipment settings and annual data pass Setup validation.' };
}

export interface YearRemovalReview {
  readonly year: number;
  readonly conditions: readonly EnergyEquipmentOperatingConditionsData[];
  readonly consumption: readonly { readonly energySource: MeterSource; readonly entries: readonly EquipmentUtilityDataEnergyUse[] }[];
}
export interface SetupRemovalReviews {
  readonly sources?: readonly SourceRemovalReview[];
  readonly years?: readonly YearRemovalReview[];
}

export function energyUseSetup(item: IdbFacilityEnergyUseEquipment): EnergyUseSetupValues {
  return normalizeEnergyUseSetup({ ...energyUseSettings(item), conditions: item.operatingConditionsData,
    consumption: item.utilityData.map(source => ({ energySource: source.energySource, entries: source.energyUse })) });
}
export function normalizeEnergyUseSetup(value: EnergyUseSetupValues): EnergyUseSetupValues {
  return { ...normalizeEnergyUseSettings(value), conditions: value.conditions.map(conditionsValues),
    consumption: value.consumption.map(source => ({ energySource: source.energySource, entries: source.entries.map(row => ({
      year: row.year, energyUse: row.overrideEnergyUse ? row.energyUse : null, overrideEnergyUse: row.overrideEnergyUse,
      energyUseUnit: row.energyUseUnit, ...(row.copy ? { copy: structuredClone(row.copy) } : {}) })) })) };
}
function conditionsValues(row: AnnualConditionsValues): AnnualConditionsValues {
  return { year: row.year, hoursOfOperation: row.hoursOfOperation, loadFactor: row.loadFactor, dutyFactor: row.dutyFactor,
    efficiency: row.efficiency, ...(row.hoursPerDay != null ? { hoursPerDay: row.hoursPerDay } : {}),
    ...(row.daysPerWeek != null ? { daysPerWeek: row.daysPerWeek } : {}), ...(row.weeksPerYear != null ? { weeksPerYear: row.weeksPerYear } : {}) };
}
export function energyUseYears(value: EnergyUseSetupValues): number[] {
  return [...new Set([...value.conditions.map(row => row.year), ...value.consumption.flatMap(source => source.entries.map(row => row.year))])].sort((a, b) => a - b);
}
export function reviewEnergyUseYear(item: IdbFacilityEnergyUseEquipment, year: number): YearRemovalReview {
  return structuredClone({ year, conditions: item.operatingConditionsData.filter(row => row.year === year),
    consumption: item.utilityData.map(source => ({ energySource: source.energySource, entries: source.energyUse.filter(row => row.year === year) })) });
}
function unique<T>(rows: readonly T[], key: (row: T) => string | number): boolean {
  return new Set(rows.map(key)).size === rows.length;
}
function assertAmbiguousRowsUnchanged<T>(value: readonly T[], base: readonly T[], key: (row: T) => string | number, message: string): void {
  for (const identity of new Set([...value, ...base].map(key))) {
    const rows = value.filter(row => key(row) === identity), before = base.filter(row => key(row) === identity);
    if ((rows.length > 1 || before.length > 1) && !draftEqual(rows, before)) throw new Error(message);
  }
}
function conditionsError(row: AnnualConditionsValues, electricity: boolean): string | undefined {
  if (![row.hoursOfOperation, row.loadFactor, row.dutyFactor, row.efficiency].every(Number.isFinite)
    || row.hoursOfOperation! < 0 || row.loadFactor! < 0 || row.loadFactor! > 115 || row.dutyFactor! < 0 || row.dutyFactor! > 100
    || row.efficiency! < 0 || row.efficiency! > 100 || (electricity && row.efficiency === 0)) return `Check operating assumptions for ${row.year}. Electricity efficiency must be greater than zero.`;
  return undefined;
}
export function estimateEnergyUse(value: EnergyUseSetupValues, energySource: MeterSource, year: number, unit: string): number {
  const sources = value.sources.filter(row => row.energySource === energySource), conditions = value.conditions.filter(row => row.year === year);
  if (sources.length !== 1 || conditions.length !== 1) throw new Error(`Cannot estimate ${energySource} for ${year}: source or operating assumptions are missing or repeated.`);
  const error = conditionsError(conditions[0], energySource === 'Electricity');
  if (error) throw new Error(error);
  if (!validEnergyUseSource(sources[0]) || !footprintEnergyUseUnits.includes(unit)) throw new Error(`Check capacity and units for ${energySource} in ${year}.`);
  const amount = calculateTotalEquipmentEnergyUse(conditions[0] as EnergyEquipmentOperatingConditionsData, { ...sources[0], energyUse: [] }, unit);
  if (!Number.isFinite(amount) || amount < 0) throw new Error(`Cannot estimate ${energySource} for ${year} in the selected units.`);
  return amount;
}
function copiedAmountMatches(row: AnnualConsumptionValues, conditions: AnnualConditionsValues | undefined, source: EnergyUseSourceValues | undefined): boolean {
  return !!row.copy && row.copy.energyUseUnit === row.energyUseUnit && draftEqual(row.copy.conditions, conditions) && draftEqual(row.copy.source, source);
}
/** The same amount is used by previews and Copy Year, including pending input changes. */
export function energyUseConsumptionAmount(value: EnergyUseSetupValues, item: IdbFacilityEnergyUseEquipment | undefined, energySource: MeterSource, row: AnnualConsumptionValues): number | null {
  if (row.overrideEnergyUse) return row.energyUse;
  const saved = item ? energyUseSetup(item) : undefined;
  const savedSources = item?.utilityData.filter(source => source.energySource === energySource) ?? [];
  const savedAmounts = savedSources.length === 1 ? savedSources[0].energyUse.filter(entry => entry.year === row.year) : [];
  const baseline = saved?.consumption.find(source => source.energySource === energySource)?.entries.find(entry => entry.year === row.year);
  const source = value.sources.filter(source => source.energySource === energySource);
  const changed = !baseline || !draftEqual(baseline, { year: row.year, energyUse: null, overrideEnergyUse: false, energyUseUnit: row.energyUseUnit })
    || !draftEqual(value.conditions.filter(entry => entry.year === row.year), saved?.conditions.filter(entry => entry.year === row.year))
    || !draftEqual(source, saved?.sources.filter(entry => entry.energySource === energySource));
  if (!changed) return savedAmounts[0]?.energyUse ?? null;
  return copiedAmountMatches(row, value.conditions.find(entry => entry.year === row.year), source[0]) ? row.copy!.amount
    : estimateEnergyUse(value, energySource, row.year, row.energyUseUnit);
}
export function energyUseSetupError(value: EnergyUseSetupValues, base: EnergyUseSetupValues): string | undefined {
  const setupError = energyUseSettingsError(value, base);
  if (setupError) return setupError;
  try { validateAnnualChanges(value, base); } catch (error) { return (error as Error).message; }
  return undefined;
}
function validateAnnualChanges(value: EnergyUseSetupValues, base: EnergyUseSetupValues): void {
  if (draftEqual(value.conditions, base.conditions) && draftEqual(value.consumption, base.consumption) && draftEqual(value.sources, base.sources)) return;
  assertAmbiguousRowsUnchanged(value.conditions, base.conditions, row => row.year, 'Repeated operating years cannot be edited safely.');
  for (const row of value.conditions) {
    if (value.conditions.filter(saved => saved.year === row.year).length > 1) continue;
    const before = base.conditions.find(saved => saved.year === row.year);
    if (draftEqual(row, before)) continue;
    if (!Number.isInteger(row.year) || row.year < 1 || row.year > 9999) throw new Error('Enter a fiscal year from 1 to 9999.');
    const error = conditionsError(row, value.sources.some(source => source.energySource === 'Electricity'));
    if (error) throw new Error(error);
  }
  assertAmbiguousRowsUnchanged(value.consumption, base.consumption, row => row.energySource, 'Repeated saved source types cannot be edited safely.');
  for (const source of value.consumption) {
    if (value.consumption.filter(saved => saved.energySource === source.energySource).length > 1) {
      if (source.entries.some(row => !row.overrideEnergyUse && !draftEqual(value.conditions.filter(saved => saved.year === row.year), base.conditions.filter(saved => saved.year === row.year)))) {
        throw new Error(`Repeated ${source.energySource} sources cannot be recalculated safely.`);
      }
      continue;
    }
    const old = base.consumption.find(saved => saved.energySource === source.energySource);
    assertAmbiguousRowsUnchanged(source.entries, old?.entries ?? [], row => row.year, `Repeated years for ${source.energySource} cannot be edited safely.`);
    if (!value.sources.some(row => row.energySource === source.energySource)) throw new Error('Annual values reference a removed source.');
    for (const row of source.entries) {
      const beforeRows = old?.entries.filter(saved => saved.year === row.year) ?? [];
      const ambiguous = source.entries.filter(saved => saved.year === row.year).length > 1 || beforeRows.length > 1;
      const before = beforeRows[0];
      const calculationChanged = !draftEqual(value.sources.filter(saved => saved.energySource === source.energySource), base.sources.filter(saved => saved.energySource === source.energySource))
        || !draftEqual(value.conditions.filter(saved => saved.year === row.year), base.conditions.filter(saved => saved.year === row.year));
      if ((ambiguous || draftEqual(row, before)) && !calculationChanged) continue;
      if (ambiguous) {
        if (!row.overrideEnergyUse) throw new Error(`Repeated ${source.energySource} entries for ${row.year} cannot be recalculated safely.`);
        continue;
      }
      if (!Number.isInteger(row.year) || row.year < 1 || row.year > 9999 || !footprintEnergyUseUnits.includes(row.energyUseUnit)) throw new Error(`Check year and consumption units for ${source.energySource} in ${row.year}.`);
      if (row.overrideEnergyUse && (!Number.isFinite(row.energyUse) || row.energyUse! < 0)) throw new Error(`Enter a finite consumption of at least zero for ${source.energySource} in ${row.year}.`);
      if (!row.overrideEnergyUse) estimateEnergyUse(value, source.energySource, row.year, row.energyUseUnit);
    }
  }
}

/** Safe fallback for imported collections whose natural keys are ambiguous. */
function mergeRows<T>(base: readonly T[], local: readonly T[], saved: readonly T[], key: (row: T) => string, merge: (b: T, l: T, s: T, prefix: string) => DraftMerge<T>, choices: ConflictChoices, prefix: string): DraftMerge<readonly T[]> {
  if ([base, local, saved].every(rows => unique(rows, key))) return reconcileKeyedItems(base, local, saved, key, merge, choices, prefix);
  const identities = [...new Set([...saved, ...local, ...base].map(key))];
  const ambiguous = new Set(identities.filter(identity => [base, local, saved].some(rows => rows.filter(row => key(row) === identity).length > 1)));
  const unambiguous = (rows: readonly T[]) => rows.filter(row => !ambiguous.has(key(row)));
  const result = reconcileKeyedItems(unambiguous(base), unambiguous(local), unambiguous(saved), key, merge, choices, prefix);
  const values = new Map(result.value.map(row => [key(row), [row]])), baselines = new Map(result.baseline!.map(row => [key(row), [row]]));
  const conflicts = [...result.conflicts];
  for (const identity of ambiguous) {
    const rows = (values: readonly T[]) => ({ rows: values.filter(row => key(row) === identity) });
    const repeated = reconcileFields(rows(base), rows(local), rows(saved), { choices, prefix: `${prefix}.${identity}`,
      groups: [{ id: 'ambiguous', label: 'Imported repeated rows', keys: ['rows'] }] });
    values.set(identity, [...repeated.value.rows]); baselines.set(identity, [...repeated.baseline!.rows]); conflicts.push(...repeated.conflicts);
  }
  return { value: identities.flatMap(identity => values.get(identity) ?? []), baseline: identities.flatMap(identity => baselines.get(identity) ?? []), conflicts };
}
function replaceMatching<T>(rows: readonly T[], replacement: readonly T[], matches: (row: T) => boolean): T[] {
  let replaced = false;
  const result = rows.flatMap(row => {
    if (!matches(row)) return [row];
    if (replaced) return [];
    replaced = true;
    return structuredClone([...replacement]);
  });
  if (!replaced) result.push(...structuredClone(replacement));
  return result;
}
/** Retain a complete removed-year snapshot until its single destructive choice is accepted. */
function retainYear(target: EnergyUseSetupValues, snapshot: EnergyUseSetupValues, year: number): EnergyUseSetupValues {
  const available = [...snapshot.consumption];
  const consumption = target.consumption.map(source => {
    const index = available.findIndex(row => row.energySource === source.energySource);
    const reference = index < 0 ? undefined : available.splice(index, 1)[0];
    return { ...source, entries: replaceMatching(source.entries, reference?.entries.filter(row => row.year === year) ?? [], row => row.year === year) };
  });
  for (const source of available) {
    if (target.sources.some(row => row.energySource === source.energySource)) consumption.push({ ...source, entries: source.entries.filter(row => row.year === year) });
  }
  return { ...target, conditions: replaceMatching(target.conditions, snapshot.conditions.filter(row => row.year === year), row => row.year === year), consumption };
}
function underPath(id: string, prefix: string): boolean { return id === prefix || id.startsWith(`${prefix}.`); }
export function reconcileEnergyUseSetup(base: EnergyUseSetupValues, local: EnergyUseSetupValues, saved: EnergyUseSetupValues, choices: ConflictChoices = {}): DraftMerge<EnergyUseSetupValues> {
  base = normalizeEnergyUseSetup(base); local = normalizeEnergyUseSetup(local); saved = normalizeEnergyUseSetup(saved);
  const settings = reconcileEnergyUseSettings(base, local, saved, choices);
  const conditions = mergeRows(base.conditions, local.conditions, saved.conditions, row => String(row.year),
    (b, l, s, prefix) => reconcileFields(b, l, s, { choices, prefix }), choices, 'years');
  const consumption = mergeRows(base.consumption, local.consumption, saved.consumption, row => row.energySource, (b, l, s, prefix) => {
    const entries = mergeRows(b.entries, l.entries, s.entries, row => String(row.year), (before, mine, theirs, path) => reconcileFields(before, mine, theirs,
      { choices, prefix: path, groups: [{ id: 'consumption', label: `${s.energySource}: consumption, override, and units`, keys: ['energyUse', 'overrideEnergyUse', 'energyUseUnit', 'copy'] }] }), choices, prefix);
    return { value: { energySource: s.energySource, entries: entries.value }, baseline: { energySource: s.energySource, entries: entries.baseline! }, conflicts: entries.conflicts };
  }, choices, 'sources');
  let value = { ...settings.value, conditions: conditions.value, consumption: consumption.value };
  let baseline = { ...settings.baseline!, conditions: conditions.baseline!, consumption: consumption.baseline! };
  let conflicts = [...settings.conflicts, ...conditions.conflicts, ...consumption.conflicts];
  // Cross-collection deletion must not silently discard a locally edited year or source.
  const removedSources = [...new Set(base.sources.map(row => row.energySource))].filter(source =>
    !saved.sources.some(row => row.energySource === source) && local.sources.some(row => row.energySource === source)
    && !draftEqual(base.consumption.filter(row => row.energySource === source), local.consumption.filter(row => row.energySource === source)));
  if (removedSources.length) {
    const id = 'removed-sources';
    conflicts = conflicts.filter(conflict => conflict.id !== 'configuration' && !removedSources.some(source => underPath(conflict.id, `sources.${source}`)));
    const accepted = choices[id] === 'saved', selected = accepted ? saved : local;
    value = { ...value, sources: selected.sources, utilityMeterGroupIds: selected.utilityMeterGroupIds };
    baseline = { ...baseline, sources: accepted ? saved.sources : base.sources, utilityMeterGroupIds: accepted ? saved.utilityMeterGroupIds : base.utilityMeterGroupIds };
    for (const source of removedSources) {
      value.consumption = replaceMatching(value.consumption, accepted ? [] : local.consumption.filter(row => row.energySource === source), row => row.energySource === source);
      baseline.consumption = replaceMatching(baseline.consumption, accepted ? [] : base.consumption.filter(row => row.energySource === source), row => row.energySource === source);
    }
    if (!accepted) conflicts.push({ id, label: `${removedSources.join(', ')} was removed; accept saved source configuration and meter links to discard its annual drafts`,
      localValue: { sources: local.sources, utilityMeterGroupIds: local.utilityMeterGroupIds, consumption: local.consumption.filter(row => removedSources.includes(row.energySource)) },
      savedValue: { sources: saved.sources, utilityMeterGroupIds: saved.utilityMeterGroupIds }, allowedChoices: ['saved'] });
  }
  for (const year of energyUseYears(base)) {
    const yearData = (draft: EnergyUseSetupValues) => ({ conditions: draft.conditions.filter(row => row.year === year), consumption: draft.consumption.map(source => ({ energySource: source.energySource, entries: source.entries.filter(row => row.year === year) })) });
    if (!energyUseYears(saved).includes(year) && !draftEqual(yearData(base), yearData(local)) && energyUseYears(local).includes(year)) {
      const id = `removed-year.${year}`;
      conflicts = conflicts.filter(conflict => !underPath(conflict.id, `years.${year}`)
        && !base.consumption.some(source => underPath(conflict.id, `sources.${source.energySource}.${year}`)));
      if (choices[id] === 'saved') {
        const withoutYear = (draft: EnergyUseSetupValues) => ({ ...draft, conditions: draft.conditions.filter(row => row.year !== year),
          consumption: draft.consumption.map(source => ({ ...source, entries: source.entries.filter(row => row.year !== year) })) });
        value = withoutYear(value); baseline = withoutYear(baseline);
      }
      else {
        value = retainYear(value, local, year); baseline = retainYear(baseline, base, year);
        conflicts.push({ id, label: `${year} was removed from saved history; use saved values to discard this year`, localValue: yearData(local), savedValue: undefined, allowedChoices: ['saved'] });
      }
    }
  }
  return { value, baseline, conflicts };
}

export function addEnergyUseYear(value: EnergyUseSetupValues, year: number, facility: IdbFacility, copyFrom?: { readonly year: number; readonly item: IdbFacilityEnergyUseEquipment }): EnergyUseSetupValues {
  if (!Number.isInteger(year) || year < 1 || year > 9999) throw new Error('Enter a fiscal year from 1 to 9999.');
  if (energyUseYears(value).includes(year)) throw new Error(`Fiscal year ${year} already exists.`);
  if (!unique(value.sources, row => row.energySource) || !unique(value.consumption, row => row.energySource)) throw new Error('Repeated saved source types cannot be copied or initialized safely.');
  const from = copyFrom ? value.conditions.filter(row => row.year === copyFrom.year) : [];
  if (copyFrom && from.length !== 1) throw new Error('The copied year needs one complete set of operating assumptions.');
  const conditions = { ...(copyFrom ? structuredClone(from[0]) : { hoursOfOperation: 8760, loadFactor: 100, dutyFactor: 100, efficiency: 100 }), year };
  const result: EnergyUseSetupValues = { ...structuredClone(value), conditions: [...value.conditions, conditions], consumption: value.sources.map(source => {
    const existing = value.consumption.find(row => row.energySource === source.energySource);
    const entries = existing?.entries ?? [];
    const rows = copyFrom ? entries.filter(row => row.year === copyFrom.year) : [];
    if (copyFrom && rows.length !== 1) throw new Error(`The copied year is missing or repeats ${source.energySource} consumption.`);
    const row: AnnualConsumptionValues = copyFrom ? { ...structuredClone(rows[0]), year } : { year, energyUse: null, overrideEnergyUse: false, energyUseUnit: facility.energyUnit };
    if (copyFrom && !row.overrideEnergyUse) {
      const amount = energyUseConsumptionAmount(value, copyFrom.item, source.energySource, rows[0]);
      if (!Number.isFinite(amount) || amount! < 0) throw new Error(`The copied year needs valid ${source.energySource} consumption.`);
      return { energySource: source.energySource, entries: [...entries, { ...row, copy: { amount: amount!, conditions: structuredClone(conditions), source: structuredClone(source), energyUseUnit: row.energyUseUnit } }] };
    }
    return { energySource: source.energySource, entries: [...entries, row] };
  }) };
  return result;
}
export function removeEnergyUseYear(value: EnergyUseSetupValues, year: number): EnergyUseSetupValues {
  if (value.conditions.filter(row => row.year === year).length > 1 || value.consumption.some(source => source.entries.filter(row => row.year === year).length > 1)) throw new Error('Repeated saved years cannot be removed safely.');
  return { ...structuredClone(value), conditions: value.conditions.filter(row => row.year !== year), consumption: value.consumption.map(source => ({ ...source, entries: source.entries.filter(row => row.year !== year) })) };
}

/** Clone latest records, patch edited inputs, and preserve untouched history and unknown fields. */
export function applyEnergyUseSetup(current: IdbFacilityEnergyUseEquipment, value: EnergyUseSetupValues, facility: IdbFacility, reviews: SetupRemovalReviews = {}): IdbFacilityEnergyUseEquipment {
  value = normalizeEnergyUseSetup(value);
  const base = energyUseSetup(current), error = energyUseSetupError(value, base);
  if (error) throw new Error(error);
  for (const year of energyUseYears(base).filter(year => !energyUseYears(value).includes(year))) {
    const retainedHistory = base.conditions.some(row => row.year === year) || current.utilityData.some(source =>
      value.sources.some(retained => retained.energySource === source.energySource) && source.energyUse.some(row => row.year === year));
    // A reviewed source removal already authorizes its own history, including orphan years.
    if (!retainedHistory) continue;
    if (!reviews.years?.some(review => draftEqual(review, reviewEnergyUseYear(current, year)))) throw new Error(`Saved history for ${year} changed. Review its removal again.`);
  }
  const updated = applyEnergyUseSettings(current, value, facility, reviews.sources, false);
  const conditionOccurrences = new Map<number, number>();
  updated.operatingConditionsData = value.conditions.map(row => {
    const matches = current.operatingConditionsData.filter(saved => saved.year === row.year);
    const occurrence = conditionOccurrences.get(row.year) ?? 0;
    conditionOccurrences.set(row.year, occurrence + 1);
    if (matches.length > 1) return structuredClone(matches[occurrence]);
    if (matches[0] && draftEqual(row, conditionsValues(matches[0]))) return structuredClone(matches[0]);
    const conditions = { ...matches[0], ...row } as EnergyEquipmentOperatingConditionsData;
    for (const field of ['hoursPerDay', 'daysPerWeek', 'weeksPerYear'] as const) { if (row[field] == null) delete conditions[field]; }
    return conditions;
  });
  for (const source of updated.utilityData) {
    const rows = value.consumption.filter(row => row.energySource === source.energySource);
    if (rows.length !== 1) continue;
    const oldSources = current.utilityData.filter(row => row.energySource === source.energySource);
    if (oldSources.length > 1) continue;
    const beforeSource = oldSources[0];
    const oldInput = base.sources.find(row => row.energySource === source.energySource);
    const newInput = value.sources.find(row => row.energySource === source.energySource);
    const entryOccurrences = new Map<number, number>();
    source.energyUse = rows[0].entries.map(row => {
      const matches = beforeSource?.energyUse.filter(saved => saved.year === row.year) ?? [];
      const occurrence = entryOccurrences.get(row.year) ?? 0;
      entryOccurrences.set(row.year, occurrence + 1);
      if (matches.length > 1) return structuredClone(matches[occurrence]);
      const before = matches[0], beforeValue = base.consumption.find(saved => saved.energySource === source.energySource)?.entries.find(saved => saved.year === row.year);
      const condition = value.conditions.find(saved => saved.year === row.year);
      const changed = !before || !draftEqual(oldInput, newInput) || !draftEqual(beforeValue, row)
        || !draftEqual(base.conditions.filter(saved => saved.year === row.year), value.conditions.filter(saved => saved.year === row.year));
      if (!changed) return structuredClone(before);
      const amount = row.overrideEnergyUse ? row.energyUse! : !before && copiedAmountMatches(row, condition, newInput)
        ? row.copy!.amount : estimateEnergyUse(value, source.energySource, row.year, row.energyUseUnit);
      if (!Number.isFinite(amount) || amount < 0) throw new Error(`Check consumption for ${source.energySource} in ${row.year}.`);
      return { ...before, year: row.year, energyUse: amount, overrideEnergyUse: row.overrideEnergyUse, energyUseUnit: row.energyUseUnit };
    });
  }
  return updated;
}
