import { CalanderizedMeter } from '@data/models/calanderization';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { InventoryChartTrace, InventoryChartView } from '../inventory-chart-sheet/inventory-chart-sheet.models';
import { buildInventoryChartStyles } from '../inventory-chart-styles';

export type MeterChartGrouping = 'facilities' | 'groups' | 'meters';
export function buildInventoryMeterCharts(meters: readonly CalanderizedMeter[], facilities: readonly IdbFacility[],
  groups: readonly IdbUtilityMeterGroup[], grouping: MeterChartGrouping, energyUnit: string, waterUnit: string): InventoryChartView[] {
  const owners = new Map(facilities.map(f => [f.guid, f.name]));
  const ownedGroups = new Map(groups.map(g => [g.guid, g]));
  const identity = (item: CalanderizedMeter) => {
    const meter = item.meter, facility = owners.get(meter.facilityId) || 'Facility';
    const candidate = ownedGroups.get(meter.groupId), group = candidate?.facilityId === meter.facilityId ? candidate : undefined;
    const owner = { facilityGuid: meter.facilityId, facilityName: facility };
    return grouping === 'facilities' ? { ...owner, id: `facility:${meter.facilityId}`, label: facility, shortLabel: facility, kind: 'facility' as const }
      : grouping === 'groups' ? { ...owner, id: `group:${meter.facilityId}:${group?.guid || 'unassigned'}`, label: `${facility} / ${group?.name || 'Unassigned'}`, shortLabel: group?.name || 'Unassigned', kind: 'group' as const }
      : { ...owner, id: meter.guid, label: `${facility} / ${meter.name}`, shortLabel: meter.name, kind: 'meter' as const };
  };
  return (['energy', 'water', 'cost'] as const).flatMap(kind => {
    const eligible = meters.filter(item => kind === 'energy' ? item.showEnergyUse : kind === 'water'
      ? ['Water Intake', 'Water Discharge'].includes(item.meter.source) : true);
    const series = new Map<string, ReturnType<typeof identity>>(), values = new Map<number, Record<string, number>>();
    let first = Infinity, last = -Infinity;
    for (const item of eligible) {
      const entry = identity(item); series.set(entry.id, entry);
      for (const month of item.monthlyData) {
        const key = month.year * 12 + month.monthNumValue;
        if (!Number.isFinite(key)) continue;
        first = Math.min(first, key); last = Math.max(last, key);
        const value = kind === 'energy' ? month.energyUse : kind === 'water' ? month.energyConsumption : month.energyCost;
        if (!Number.isFinite(value)) continue;
        const row = values.get(key) || {}; row[entry.id] = (row[entry.id] ?? 0) + value; values.set(key, row);
      }
    }
    // Availability follows finite samples, including zero, independently of trace visibility.
    if (!values.size) return [];
    const entries = [...series.values()].sort((a,b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id));
    const styles = buildInventoryChartStyles(entries.map(entry => entry.id));
    const labelCounts = new Map<string, number>();
    for (const entry of entries) labelCounts.set(entry.label, (labelCounts.get(entry.label) ?? 0) + 1);
    const unit = kind === 'energy' ? energyUnit : kind === 'water' ? waterUnit : 'USD';
    const date = (key: number) => new Date(Math.floor(key / 12), key % 12, 1);
    const label = (key: number) => date(key).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const rows: InventoryChartView['rows'][number][] = [];
    for (let key = first; key <= last; key++) rows.push({ periodKey: String(key), periodLabel: label(key), sortValue: date(key).getTime(), values: values.get(key) || {} });
    return [{ id: kind, title: kind === 'energy' ? 'Energy' : kind === 'water' ? 'Water' : 'Cost', unit,
      coverage: Number.isFinite(first) ? `${label(first)} – ${label(last)}` : 'No monthly data', rows,
      metrics: entries.map<InventoryChartTrace>(entry => ({ ...entry, label: labelCounts.get(entry.label)! > 1 ? `${entry.label} (${entry.id})` : entry.label, unit, currency: kind === 'cost', ...styles.get(entry.id) })) }];
  });
}
