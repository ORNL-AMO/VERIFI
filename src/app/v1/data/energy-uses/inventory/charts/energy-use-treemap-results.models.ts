import type { IdbFacility } from '@data/models/idbModels/facility';
import type { IdbFacilityEnergyUseEquipment } from '@data/models/idbModels/facilityEnergyUseEquipment';
import { energyUseFiscalPeriod, energyUsePercent, projectEnergyUse, ProjectedEnergyUse, EnergyUseTreemapNode } from '../../models/energy-use-projection.models';
import { summarizeEnergyUseYear } from '../../models/energy-use-results.models';

export interface TreemapFacilityResults {
  readonly guid: string;
  readonly total: number;
  readonly partial: boolean;
}
export interface EnergyUseTreemapResults {
  readonly rows: readonly ProjectedEnergyUse[];
  readonly facilities: ReadonlyMap<string, TreemapFacilityResults>;
  readonly accountTotal: number | null;
  readonly accountPartial: boolean;
  readonly accountComparable: boolean;
}

export function treemapUsageShares(node: Pick<EnergyUseTreemapNode, 'value' | 'facilityGuid'>, results: EnergyUseTreemapResults) {
  const facility = node.facilityGuid ? results.facilities.get(node.facilityGuid) : undefined;
  return { facilityShare: facility ? energyUsePercent(node.value, facility.total) : null,
    accountShare: results.accountTotal === null ? null : energyUsePercent(node.value, results.accountTotal),
    sharesPartial: !!facility?.partial || results.accountPartial };
}

/** Equipment shares use the full facility/account scope, independently of inventory filters. */
export function buildEnergyUseTreemapResults(items: readonly IdbFacilityEnergyUseEquipment[], facilities: readonly Readonly<IdbFacility>[],
  accountGuid: string, year: number, unit: string): EnergyUseTreemapResults {
  const rows: ProjectedEnergyUse[] = [];
  const periods = new Set<string>();
  let invalidPeriod = false;
  const relevant: TreemapFacilityResults[] = [];
  const facilityResults = facilities.filter(facility => facility.accountId === accountGuid).map(facility => {
    const members = items.filter(item => item.accountId === accountGuid && item.facilityId === facility.guid);
    const period = energyUseFiscalPeriod(facility, year);
    const projected = members.flatMap(item => { const row = projectEnergyUse(item, facility, year, unit); return row ? [row] : []; });
    rows.push(...projected);
    const annual = summarizeEnergyUseYear(projected, year);
    const result = { guid: facility.guid, total: annual.total, partial: annual.partial || projected.length !== members.length };
    if (members.length) {
      if (period) periods.add(period.key); else invalidPeriod = true;
      relevant.push(result);
    }
    return [facility.guid, result] as const;
  });
  const accountComparable = !invalidPeriod && periods.size <= 1;
  return { rows, facilities: new Map(facilityResults), accountTotal: accountComparable ? relevant.reduce((sum, row) => sum + row.total, 0) : null,
    accountComparable, accountPartial: relevant.some(row => row.partial) };
}
