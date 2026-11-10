import type { IdbFacility } from '@data/models/idbModels/facility';
import type { EnergyUseGroupEntry } from '../inventory/energy-use-group.models';
import { energyUseChartYears, energyUseFiscalPeriod, energyUsePercent, projectEnergyUse, ProjectedConsumption } from './energy-use-projection.models';
import { energyUseSourceBreakdown, summarizeEnergyUseYear } from './energy-use-results.models';

export interface FacilityEnergyUseGroupResult {
  readonly group: EnergyUseGroupEntry;
  readonly amount: number | null;
  readonly percent: number | null;
  readonly partial: boolean;
  readonly sources: readonly ProjectedConsumption[];
}

export interface FacilityEnergyUseSourceResult {
  readonly source: string;
  readonly total: number | null;
  readonly partial: boolean;
  readonly groups: readonly FacilityEnergyUseGroupResult[];
}

export interface FacilityEnergyUseResult {
  readonly year: number;
  readonly period: string;
  readonly total: number;
  readonly partial: boolean;
  readonly groups: readonly FacilityEnergyUseGroupResult[];
  readonly sources: readonly FacilityEnergyUseSourceResult[];
}

/** Aggregate every facility member at one common fiscal year, including orphan groups. */
export function buildFacilityEnergyUseResult(groups: readonly EnergyUseGroupEntry[], facility: IdbFacility, fiscalYear?: number): FacilityEnergyUseResult | undefined {
  const owned = groups.filter(group => group.facility.guid === facility.guid && group.facility.accountId === facility.accountId)
    .sort((a, b) => a.name.localeCompare(b.name) || a.guid.localeCompare(b.guid));
  const members = (group: EnergyUseGroupEntry) => group.items.filter(entry => entry.item.facilityId === facility.guid && entry.item.accountId === facility.accountId);
  const year = fiscalYear ?? energyUseChartYears(owned.flatMap(group => members(group).map(entry => entry.item))).at(-1);
  if (year === undefined) return undefined;
  const period = energyUseFiscalPeriod(facility, year);
  if (!period) return undefined;
  const sources = new Map<string, FacilityEnergyUseGroupResult[]>();
  const rows = owned.map(group => {
    const result = summarizeEnergyUseYear(members(group).flatMap(entry => {
      const projected = projectEnergyUse(entry.item, facility, year, facility.energyUnit);
      return projected ? [projected] : [];
    }), year);
    for (const source of energyUseSourceBreakdown(result)) {
      const bucket = sources.get(source.source) ?? [];
      bucket.push({ group, amount: source.total, percent: null, partial: source.partial, sources: source.items.flatMap(item => item.sources) });
      sources.set(source.source, bucket);
    }
    return { group, amount: result.items.some(item => item.amount !== null) ? result.total : null,
      percent: null, partial: result.partial, sources: result.items.flatMap(item => item.projection.sources) };
  });
  const total = rows.reduce((sum, row) => sum + (row.amount ?? 0), 0);
  return { year, period: period.label, total, partial: rows.some(row => row.partial),
    groups: rows.map(row => ({ ...row, percent: energyUsePercent(row.amount, total) })),
    sources: [...sources].sort(([a], [b]) => a.localeCompare(b)).map(([source, contributions]) => ({ source,
      total: contributions.some(row => row.amount !== null) ? contributions.reduce((sum, row) => sum + (row.amount ?? 0), 0) : null,
      partial: contributions.some(row => row.partial),
      groups: contributions.map(row => ({ ...row, percent: energyUsePercent(row.amount, total) })) })) };
}
