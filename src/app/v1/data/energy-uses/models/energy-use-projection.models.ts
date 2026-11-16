import { IdbFacilityEnergyUseGroup } from '@data/models/idbModels/facilityEnergyUseGroups';
import { ProjectedEnergyUse, energyUsePercent, knownEnergyUseAmount } from '@domain/calculations/energy-footprint/energy-use-projection';
export * from '@domain/calculations/energy-footprint/energy-use-projection';

export interface EnergyUseTreemapNode {
  readonly id: string; readonly name: string; readonly kind: 'period' | 'facility' | 'group' | 'item';
  readonly value: number; readonly periodKey: string; readonly partial: boolean; readonly carried: boolean;
  readonly facilityGuid?: string; readonly groupGuid?: string; readonly itemGuid?: string;
  readonly children?: readonly EnergyUseTreemapNode[]; readonly percentOfPeriod: number | null;
}
export function buildEnergyUseTreemap(rows: readonly ProjectedEnergyUse[], groups: readonly IdbFacilityEnergyUseGroup[], groupGuid?: string, facilityGuid?: string): EnergyUseTreemapNode[] {
  const periods = new Map<string, ProjectedEnergyUse[]>();
  for (const row of rows) { const bucket = periods.get(row.period.key) ?? []; bucket.push(row); periods.set(row.period.key, bucket); }
  const node = (id: string, name: string, kind: EnergyUseTreemapNode['kind'], periodKey: string, children: EnergyUseTreemapNode[], total: number,
    owner: Partial<EnergyUseTreemapNode> = {}): EnergyUseTreemapNode => ({ id, name, kind, periodKey, children, value: children.reduce((sum, child) => sum + child.value, 0),
      partial: children.some(child => child.partial), carried: children.some(child => child.carried), percentOfPeriod: energyUsePercent(children.reduce((sum, child) => sum + child.value, 0), total), ...owner });
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
          value: row.amount, periodKey, partial: row.partial, carried: row.carried, percentOfPeriod: energyUsePercent(knownEnergyUseAmount(row), total),
          facilityGuid: ownerGuid, groupGuid: guid, itemGuid: row.item.guid }));
        return node(JSON.stringify(['group', ownerGuid, guid]), group?.name || 'Group unavailable', 'group', periodKey, items, total, { facilityGuid: ownerGuid, groupGuid: guid });
      });
      return node(`facility:${ownerGuid}`, owned[0].facility.name, 'facility', periodKey, groupNodes, total, { facilityGuid: ownerGuid });
    });
    return node(`period:${periodKey}`, periodRows[0].period.label, 'period', periodKey, facilities, total);
  });
  if (groupGuid) return result.flatMap(period => period.children!.flatMap(facility => facility.children ?? []));
  if (facilityGuid) return result.flatMap(period => period.children!.flatMap(facility => facility.children ?? []));
  return result;
}
