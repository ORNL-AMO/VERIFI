import { IdbFacilityEnergyUseEquipment } from '@data/models/idbModels/facilityEnergyUseEquipment';
import { IdbFacility } from '@data/models/idbModels/facility';
import { ProjectedConsumption, ProjectedEnergyUse, energyUseChartYears, energyUsePercent, knownEnergyUseAmount, projectEnergyUse } from './energy-use-projection.models';

export interface EnergyUseResultItem {
  readonly projection: ProjectedEnergyUse;
  readonly amount: number | null;
  readonly percent: number | null;
  readonly coverage: string;
}

export interface EnergyUseAnnualResult {
  readonly year: number;
  readonly period: string;
  readonly items: readonly EnergyUseResultItem[];
  readonly total: number;
  readonly partial: boolean;
  readonly carried: boolean;
}

export interface EnergyUseSourceResultItem {
  readonly item: IdbFacilityEnergyUseEquipment;
  readonly amount: number | null;
  readonly partial: boolean;
  readonly carried: boolean;
  readonly inactive: boolean;
  readonly sources: readonly ProjectedConsumption[];
}

export interface EnergyUseSourceResult {
  readonly source: string;
  readonly items: readonly EnergyUseSourceResultItem[];
  readonly total: number | null;
  readonly partial: boolean;
}

/** One source/item contribution shared by the footprint table and Sankey links. */
export function energyUseSourceBreakdown(result: EnergyUseAnnualResult): EnergyUseSourceResult[] {
  const groups = new Map<string, EnergyUseSourceResultItem[]>();
  for (const row of result.items) {
    const occurrences = new Map<string, ProjectedConsumption[]>();
    for (const source of row.projection.sources) {
      const sources = occurrences.get(source.source) ?? [];
      sources.push(source);
      occurrences.set(source.source, sources);
    }
    for (const [source, sources] of occurrences) {
      const items = groups.get(source) ?? [];
      items.push({ item: row.projection.item, sources,
        amount: sources.some(value => value.amount !== null) ? sources.reduce((sum, value) => sum + (value.amount ?? 0), 0) : null,
        partial: sources.some(value => value.amount === null), carried: sources.some(value => value.state === 'carried'),
        inactive: sources.every(value => value.state === 'inactive') });
      groups.set(source, items);
    }
  }
  return [...groups].map(([source, items]) => ({ source, items,
    total: items.some(item => item.amount !== null) ? items.reduce((sum, item) => sum + (item.amount ?? 0), 0) : null,
    partial: items.some(item => item.partial) }));
}

export function energyUseResultCoverage(row: ProjectedEnergyUse): string {
  const states = new Set(row.sources.map(source => source.state));
  return [row.partial ? 'Partial coverage · known values only' : '',
    states.has('carried') ? 'Includes carried-forward values' : '',
    states.has('entered') ? 'Entered values' : '',
    states.has('inactive') ? 'Inactive sources' : ''].filter(Boolean).join(' · ');
}

/** The same known-value denominator is used by charts, tables and treemaps. */
export function summarizeEnergyUseYear(rows: readonly ProjectedEnergyUse[], year: number): EnergyUseAnnualResult {
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  return {
    year, period: rows[0]?.period.label ?? '', total,
    partial: rows.some(row => row.partial), carried: rows.some(row => row.carried),
    items: rows.map(projection => {
      const amount = knownEnergyUseAmount(projection);
      return { projection, amount, percent: energyUsePercent(amount, total),
        coverage: energyUseResultCoverage(projection) };
    })
  };
}

export function buildEnergyUseResults(items: readonly IdbFacilityEnergyUseEquipment[], facility: IdbFacility): EnergyUseAnnualResult[] {
  const ordered = [...items].sort((a, b) => a.name.localeCompare(b.name) || a.guid.localeCompare(b.guid));
  return energyUseChartYears(ordered).flatMap(year => {
    const rows = ordered.flatMap(item => {
      const row = projectEnergyUse(item, facility, year, facility.energyUnit);
      return row ? [row] : [];
    });
    return rows.length ? [summarizeEnergyUseYear(rows, year)] : [];
  });
}

/** Stable across input ordering, filtering, years and chart types. */
export function energyUseChartColor(identity: string): string {
  let hash = 0;
  for (const character of identity) hash = (Math.imul(hash, 31) + character.charCodeAt(0)) | 0;
  return `var(--v1-chart-series-${(hash >>> 0) % 12 + 1})`;
}
