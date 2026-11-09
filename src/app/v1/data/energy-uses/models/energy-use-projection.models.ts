import { IdbFacilityEnergyUseEquipment, EquipmentUtilityData } from '@data/models/idbModels/facilityEnergyUseEquipment';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbFacilityEnergyUseGroup } from '@data/models/idbModels/facilityEnergyUseGroups';
import { ConvertValue } from '@domain/calculations/conversions/convertValue';

export type ConsumptionProvenance = 'entered' | 'carried' | 'missing' | 'inactive' | 'invalid';
export interface ProjectedConsumption {
  readonly id: string; readonly itemGuid: string; readonly source: string; readonly sourceIndex: number;
  readonly year: number; readonly originYear?: number; readonly amount: number | null; readonly unit: string;
  readonly originalAmount?: number; readonly originalUnit?: string; readonly override: boolean;
  readonly state: ConsumptionProvenance; readonly description: string;
}
export interface EnergyUseFiscalPeriod { readonly key: string; readonly label: string; }
export interface ProjectedEnergyUse {
  readonly item: IdbFacilityEnergyUseEquipment; readonly facility: IdbFacility; readonly period: EnergyUseFiscalPeriod;
  readonly sources: readonly ProjectedConsumption[]; readonly amount: number; readonly partial: boolean; readonly carried: boolean;
}
export interface EnergyUseTreemapNode {
  readonly id: string; readonly name: string; readonly kind: 'period' | 'facility' | 'group' | 'item';
  readonly value: number; readonly periodKey: string; readonly partial: boolean; readonly carried: boolean;
  readonly facilityGuid?: string; readonly groupGuid?: string; readonly itemGuid?: string;
  readonly children?: readonly EnergyUseTreemapNode[]; readonly percentOfPeriod: number;
}
const validYear = (year: number): boolean => Number.isInteger(year) && year >= 1 && year <= 9999;
export function savedEnergyUseYears(items: readonly IdbFacilityEnergyUseEquipment[]): number[] {
  return [...new Set(items.flatMap(item => [...item.operatingConditionsData.map(row => row.year), ...item.utilityData.flatMap(source => source.energyUse.map(row => row.year))]).filter(validYear))].sort((a, b) => a - b);
}
export function energyUseChartYears(items: readonly IdbFacilityEnergyUseEquipment[]): number[] {
  const years = savedEnergyUseYears(items);
  return years.length ? Array.from({ length: years[years.length - 1] - years[0] + 1 }, (_, index) => years[0] + index) : [];
}
/** Mirrors the existing fiscal label convention; period keys use actual inclusive dates. */
export function energyUseFiscalPeriod(facility: IdbFacility, year: number): EnergyUseFiscalPeriod | undefined {
  if (!validYear(year)) return undefined;
  const calendar = facility.fiscalYear === 'calendarYear';
  const month = calendar ? 0 : facility.fiscalYearMonth;
  if (!Number.isInteger(month) || month < 0 || month > 11) return undefined;
  const startYear = calendar || !facility.fiscalYearCalendarEnd ? year : year - 1;
  const start = new Date(0); start.setFullYear(startYear, month, 1); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setFullYear(startYear + 1); end.setDate(end.getDate() - 1);
  const format = (date: Date) => `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const key = `${format(start)} / ${format(end)}`;
  return { key, label: key };
}
/** Resolves one saved source occurrence without mutating inputs or recalculating saved amounts. */
export function projectEnergyUseSource(item: IdbFacilityEnergyUseEquipment, source: EquipmentUtilityData, sourceIndex: number, year: number, unit: string): ProjectedConsumption {
  const base = { id: JSON.stringify([item.guid, sourceIndex, source.energySource]), itemGuid: item.guid, source: source.energySource, sourceIndex, year, unit, override: false };
  const invalid = (description: string): ProjectedConsumption => ({ ...base, state: 'invalid', amount: null, description });
  if (!validYear(year) || source.energyUse.some(row => !validYear(row.year))) return invalid('Invalid fiscal year in saved consumption.');
  const eligible = source.energyUse.filter(row => row.year <= year);
  const originYear = eligible.length ? Math.max(...eligible.map(row => row.year)) : undefined;
  const rows = eligible.filter(row => row.year === originYear);
  if (rows.length > 1) return invalid(`Repeated saved entries for FY ${originYear}; no value can be selected safely.`);
  // Retirement limits projection only: explicitly entered later history remains visible.
  const retired = item.noLongerInUse?.isNoLongerInUse;
  if (originYear !== year && retired && !validYear(item.noLongerInUse.year)) return invalid('Retirement year is unavailable.');
  if (originYear !== year && retired && year > item.noLongerInUse.year) return { ...base, state: 'inactive', amount: 0, description: `Inactive after FY ${item.noLongerInUse.year}; no carry-forward.` };
  if (!rows.length) return { ...base, state: 'missing', amount: null, description: 'No earlier saved consumption; no backward projection.' };
  const row = rows[0];
  if (row.energyUse == null || !Number.isFinite(row.energyUse) || row.energyUse < 0 || !row.energyUseUnit || !unit) return invalid(`Invalid saved consumption in FY ${originYear}.`);
  const converted = new ConvertValue(row.energyUse, row.energyUseUnit, unit);
  if (converted.hasError || !Number.isFinite(converted.convertedValue) || converted.convertedValue < 0) return invalid(`Cannot convert saved ${row.energyUseUnit} to ${unit}.`);
  return { ...base, originYear, originalAmount: row.energyUse, originalUnit: row.energyUseUnit, override: !!row.overrideEnergyUse,
    state: originYear === year ? 'entered' : 'carried', amount: converted.convertedValue,
    description: `${originYear === year ? `Entered in FY ${year}` : `Carried forward from FY ${originYear}`}${row.overrideEnergyUse ? ' · Manual override' : ''}` };
}
export function projectEnergyUse(item: IdbFacilityEnergyUseEquipment, facility: IdbFacility, year: number, unit: string): ProjectedEnergyUse | undefined {
  const period = energyUseFiscalPeriod(facility, year); if (!period) return undefined;
  const sources = item.utilityData.map((source, index) => projectEnergyUseSource(item, source, index, year, unit));
  return { item, facility, period, sources, amount: sources.reduce((sum, source) => sum + (source.amount ?? 0), 0),
    partial: !sources.length || sources.some(source => source.state === 'missing' || source.state === 'invalid'), carried: sources.some(source => source.state === 'carried') };
}
export function buildEnergyUseTreemap(rows: readonly ProjectedEnergyUse[], groups: readonly IdbFacilityEnergyUseGroup[], groupGuid?: string, facilityGuid?: string): EnergyUseTreemapNode[] {
  const periods = new Map<string, ProjectedEnergyUse[]>();
  for (const row of rows) { const bucket = periods.get(row.period.key) ?? []; bucket.push(row); periods.set(row.period.key, bucket); }
  const node = (id: string, name: string, kind: EnergyUseTreemapNode['kind'], periodKey: string, children: EnergyUseTreemapNode[], total: number,
    owner: Partial<EnergyUseTreemapNode> = {}): EnergyUseTreemapNode => ({ id, name, kind, periodKey, children, value: children.reduce((sum, child) => sum + child.value, 0),
      partial: children.some(child => child.partial), carried: children.some(child => child.carried), percentOfPeriod: total > 0 ? children.reduce((sum, child) => sum + child.value, 0) / total * 100 : 0, ...owner });
  const result = [...periods].sort(([a], [b]) => a.localeCompare(b)).map(([periodKey, periodRows]) => {
    const total = periodRows.reduce((sum, row) => sum + row.amount, 0);
    const facilities = [...new Set(periodRows.map(row => row.facility.guid))].map(ownerGuid => {
      const owned = periodRows.filter(row => row.facility.guid === ownerGuid);
      const grouped = new Map<string, ProjectedEnergyUse[]>();
      for (const row of owned) {
        const saved = groups.find(group => group.guid === row.item.energyUseGroupId && group.facilityId === ownerGuid && group.accountId === row.item.accountId);
        const guid = saved?.guid ?? 'unavailable', bucket = grouped.get(guid) ?? []; bucket.push(row); grouped.set(guid, bucket);
      }
      const groupNodes = [...grouped].map(([guid, members]) => {
        const group = groups.find(group => group.guid === guid && group.facilityId === ownerGuid);
        const items: EnergyUseTreemapNode[] = members.map(row => ({ id: `item:${row.item.guid}`, name: row.item.name || 'Untitled energy use', kind: 'item',
          value: row.amount, periodKey, partial: row.partial, carried: row.carried, percentOfPeriod: total > 0 ? row.amount / total * 100 : 0,
          facilityGuid: ownerGuid, groupGuid: guid, itemGuid: row.item.guid }));
        return node(JSON.stringify(['group', ownerGuid, guid]), group?.name || 'Group unavailable', 'group', periodKey, items, total, { facilityGuid: ownerGuid, groupGuid: guid });
      });
      return node(`facility:${ownerGuid}`, owned[0].facility.name, 'facility', periodKey, groupNodes, total, { facilityGuid: ownerGuid });
    });
    return node(`period:${periodKey}`, periodRows[0].period.label, 'period', periodKey, facilities, total);
  });
  if (groupGuid) return result.flatMap(period => period.children!.flatMap(facility => facility.children ?? []));
  if (facilityGuid) return result.flatMap(period => period.children ?? []);
  return result;
}
