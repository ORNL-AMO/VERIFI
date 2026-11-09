import type { MeterSource } from '@data/models/constantsAndTypes';
import { draftEqual, reconcileFields, reconcileKeyedItems } from '@app/v1/data/editing/draft-reconciliation';
import type { ConflictChoices, DraftMerge } from '@app/v1/data/editing/draft-reconciliation';
import { reconcileEnergyUseSettings } from './energy-use-settings.models';
import { energyUseYears, normalizeEnergyUseSetup } from './energy-use-setup.values';
import type { EnergyUseSetupValues } from './energy-use-setup.values';

function hasUniqueKeys<T>(rows: readonly T[], key: (row: T) => string | number): boolean {
  return new Set(rows.map(key)).size === rows.length;
}

/** Safe fallback for imported collections whose natural keys are ambiguous. */
function mergeRows<T>(base: readonly T[], local: readonly T[], saved: readonly T[], key: (row: T) => string,
  merge: (base: T, local: T, saved: T, prefix: string) => DraftMerge<T>, choices: ConflictChoices, prefix: string): DraftMerge<readonly T[]> {
  if ([base, local, saved].every(rows => hasUniqueKeys(rows, key))) {
    return reconcileKeyedItems(base, local, saved, key, merge, choices, prefix);
  }
  const identities = [...new Set([...saved, ...local, ...base].map(key))];
  const ambiguous = new Set(identities.filter(identity => [base, local, saved].some(rows => rows.filter(row => key(row) === identity).length > 1)));
  const unambiguous = (rows: readonly T[]) => rows.filter(row => !ambiguous.has(key(row)));
  const result = reconcileKeyedItems(unambiguous(base), unambiguous(local), unambiguous(saved), key, merge, choices, prefix);
  const values = new Map(result.value.map(row => [key(row), [row]]));
  const baselines = new Map(result.baseline!.map(row => [key(row), [row]]));
  const conflicts = [...result.conflicts];
  for (const identity of ambiguous) {
    const rows = (values: readonly T[]) => ({ rows: values.filter(row => key(row) === identity) });
    const repeated = reconcileFields(rows(base), rows(local), rows(saved), { choices, prefix: `${prefix}.${identity}`,
      groups: [{ id: 'ambiguous', label: 'Imported repeated rows', keys: ['rows'] }] });
    values.set(identity, [...repeated.value.rows]);
    baselines.set(identity, [...repeated.baseline!.rows]);
    conflicts.push(...repeated.conflicts);
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
function underPath(id: string, prefix: string): boolean {
  return id === prefix || id.startsWith(`${prefix}.`);
}
function withoutYear(value: EnergyUseSetupValues, year: number): EnergyUseSetupValues {
  return { ...value, conditions: value.conditions.filter(row => row.year !== year),
    consumption: value.consumption.map(source => ({ ...source, entries: source.entries.filter(row => row.year !== year) })) };
}
function yearData(value: EnergyUseSetupValues, year: number) {
  return { conditions: value.conditions.filter(row => row.year === year), consumption: value.consumption
    .map(source => ({ energySource: source.energySource, entries: source.entries.filter(row => row.year === year) })).filter(source => source.entries.length) };
}
function retainSources(value: EnergyUseSetupValues, snapshot: EnergyUseSetupValues, sources: readonly MeterSource[], excludedYears: readonly number[] = []): EnergyUseSetupValues {
  let consumption = value.consumption;
  for (const source of sources) {
    const replacement = snapshot.consumption.filter(row => row.energySource === source)
      .map(row => ({ ...row, entries: row.entries.filter(entry => !excludedYears.includes(entry.year)) }));
    consumption = replaceMatching(consumption, replacement, row => row.energySource === source);
  }
  return { ...value, consumption };
}
/** Resolved configuration membership owns its annual rows; independent year removals still apply. */
function matchSourceMembership(value: EnergyUseSetupValues, local: EnergyUseSetupValues, saved: EnergyUseSetupValues,
  localRemovedYears: readonly number[], savedRemovedYears: readonly number[]): EnergyUseSetupValues {
  const restoredSaved = value.sources.filter(source => saved.sources.some(row => row.energySource === source.energySource)
    && !local.sources.some(row => row.energySource === source.energySource)).map(source => source.energySource);
  const restoredLocal = value.sources.filter(source => local.sources.some(row => row.energySource === source.energySource)
    && !saved.sources.some(row => row.energySource === source.energySource)).map(source => source.energySource);
  const withSavedSources = retainSources(value, saved, restoredSaved, localRemovedYears);
  value = retainSources(withSavedSources, local, restoredLocal, savedRemovedYears);
  return { ...value, consumption: value.consumption.filter(source => value.sources.some(row => row.energySource === source.energySource)) };
}
/** Three-way draft merge, including one coherent review for destructive source/year membership. */
export function reconcileEnergyUseSetup(base: EnergyUseSetupValues, local: EnergyUseSetupValues,
  saved: EnergyUseSetupValues, choices: ConflictChoices = {}): DraftMerge<EnergyUseSetupValues> {
  base = normalizeEnergyUseSetup(base);
  local = normalizeEnergyUseSetup(local);
  saved = normalizeEnergyUseSetup(saved);
  const settings = reconcileEnergyUseSettings(base, local, saved, choices);
  const conditions = mergeRows(base.conditions, local.conditions, saved.conditions, row => String(row.year),
    (b, l, s, prefix) => reconcileFields(b, l, s, { choices, prefix }), choices, 'years');
  const consumption = mergeRows(base.consumption, local.consumption, saved.consumption, row => row.energySource, (b, l, s, prefix) => {
    const entries = mergeRows(b.entries, l.entries, s.entries, row => String(row.year), (before, mine, theirs, path) => reconcileFields(before, mine, theirs,
      { choices, prefix: path, groups: [{ id: 'consumption', label: `${s.energySource}: consumption, override, and units`, keys: ['energyUse', 'overrideEnergyUse', 'energyUseUnit'] }] }), choices, prefix);
    return { value: { energySource: s.energySource, entries: entries.value }, baseline: { energySource: s.energySource, entries: entries.baseline! }, conflicts: entries.conflicts };
  }, choices, 'sources');
  let value = { ...settings.value, conditions: conditions.value, consumption: consumption.value };
  let baseline = { ...settings.baseline!, conditions: conditions.baseline!, consumption: consumption.baseline! };
  let conflicts = [...settings.conflicts, ...conditions.conflicts, ...consumption.conflicts];
  // Structural choices span conditions, consumption, and (for sources) configuration and links.
  const baseYears = energyUseYears(base);
  const localYears = energyUseYears(local);
  const savedYears = energyUseYears(saved);
  const localRemovedYears = baseYears.filter(year => !localYears.includes(year));
  const savedRemovedYears = baseYears.filter(year => !savedYears.includes(year));
  const removedYears = baseYears.filter(year => {
    const localRemovalConflicts = localRemovedYears.includes(year) && savedYears.includes(year)
      && !draftEqual(yearData(base, year), yearData(saved, year));
    const savedRemovalConflicts = savedRemovedYears.includes(year) && localYears.includes(year)
      && !draftEqual(yearData(base, year), yearData(local, year));
    return localRemovalConflicts || savedRemovalConflicts;
  });
  const removedSources = [...new Set(base.sources.map(row => row.energySource))].filter(source => {
    const sourceHistory = (value: EnergyUseSetupValues) => value.consumption.filter(row => row.energySource === source);
    const savedRemovalConflicts = !saved.sources.some(row => row.energySource === source)
      && local.sources.some(row => row.energySource === source) && !draftEqual(sourceHistory(base), sourceHistory(local));
    const localRemovalConflicts = !local.sources.some(row => row.energySource === source)
      && saved.sources.some(row => row.energySource === source) && !draftEqual(sourceHistory(base), sourceHistory(saved));
    return savedRemovalConflicts || localRemovalConflicts;
  });
  // Overlapping year and source-membership conflicts require one coherent choice.
  if (removedYears.length && settings.conflicts.some(conflict => conflict.id === 'configuration')) {
    for (const source of [...local.sources, ...saved.sources]) {
      if (local.sources.some(row => row.energySource === source.energySource) !== saved.sources.some(row => row.energySource === source.energySource)
        && !removedSources.includes(source.energySource)) removedSources.push(source.energySource);
    }
  }
  const membershipId = removedSources.length ? 'removed-sources' : removedYears.length === 1 ? `removed-year.${removedYears[0]}` : 'history-membership';
  const structuralConflict = !!(removedSources.length || removedYears.length);
  const accepted = choices[membershipId] === 'saved';
  if (structuralConflict) {
    conflicts = conflicts.filter(conflict => !(removedSources.length && conflict.id === 'configuration')
      && !removedSources.some(source => underPath(conflict.id, `sources.${source}`))
      && !removedYears.some(year => underPath(conflict.id, `years.${year}`) || [...base.consumption, ...local.consumption, ...saved.consumption]
        .some(source => underPath(conflict.id, `sources.${source.energySource}.${year}`))));
    if (removedSources.length) {
      const selected = accepted ? saved : local;
      const before = accepted ? saved : base;
      value = { ...value, sources: selected.sources, utilityMeterGroupIds: selected.utilityMeterGroupIds };
      baseline = { ...baseline, sources: before.sources, utilityMeterGroupIds: before.utilityMeterGroupIds };
      value = retainSources(value, selected, removedSources, accepted ? localRemovedYears : []);
      baseline = retainSources(baseline, before, removedSources);
    }
    if (!accepted) {
      for (const year of removedYears) {
        value = localYears.includes(year) ? retainYear(value, local, year) : withoutYear(value, year);
        baseline = retainYear(baseline, base, year);
      }
      const snapshot = (draft: EnergyUseSetupValues) => ({ ...(removedSources.length ? { sources: draft.sources, utilityMeterGroupIds: draft.utilityMeterGroupIds,
        consumption: draft.consumption.filter(source => removedSources.includes(source.energySource)) } : {}), years: removedYears.map(year => yearData(draft, year)) });
      conflicts.push({ id: membershipId, label: `Saved history changed for ${[...removedSources, ...removedYears].join(', ')}. Keep saved history, then review any removal again.`,
        localValue: snapshot(local), savedValue: snapshot(saved), allowedChoices: ['saved'] });
      return { value, baseline, conflicts };
    }
  }
  if (!conflicts.some(conflict => conflict.id === 'configuration')) value = matchSourceMembership(value, local, saved, localRemovedYears, savedRemovedYears);
  if (structuralConflict && accepted) {
    for (const year of removedYears) {
      if (savedYears.includes(year)) {
        value = retainYear(value, saved, year);
        baseline = retainYear(baseline, saved, year);
      } else {
        value = withoutYear(value, year);
        baseline = withoutYear(baseline, year);
      }
    }
  }
  return { value, baseline, conflicts };
}
