import type { VisualizationDefinition, VisualizationFacilitySelection, VisualizationScope } from './visualization-definition';

export interface VisualizationFacilityRecord { readonly guid: string; readonly accountId: string; }
export interface VisualizationFacilityResource extends VisualizationFacilityRecord { readonly facilityId?: string; readonly name?: string; }
export interface VisualizationFacilityCatalog {
  readonly facilities: readonly VisualizationFacilityRecord[];
  readonly meters: readonly VisualizationFacilityResource[];
  readonly meterGroups: readonly VisualizationFacilityResource[];
  readonly predictors: readonly VisualizationFacilityResource[];
  readonly energyUseGroups: readonly VisualizationFacilityResource[];
  readonly energyUseEquipment: readonly VisualizationFacilityResource[];
  readonly facilityAnalyses: readonly VisualizationFacilityResource[];
  readonly accountAnalyses: readonly VisualizationFacilityResource[];
}

/** Fixed missing identities remain intent; live All follows the current account catalog. */
export function resolveVisualizationFacilities(
  definition: Pick<VisualizationDefinition, 'accountGuid' | 'facilitySelection'>,
  facilities: readonly VisualizationFacilityRecord[]
): { readonly scope: VisualizationScope; readonly missingFacilityGuids: readonly string[] } {
  const owned = facilities.filter(item => item.accountId === definition.accountGuid);
  const requested = definition.facilitySelection.kind === 'all' ? owned.map(item => item.guid) : [...definition.facilitySelection.facilityGuids];
  const included = owned.filter(item => requested.includes(item.guid)).map(item => item.guid).sort();
  const missingFacilityGuids = requested.filter(guid => !owned.some(item => item.guid === guid));
  const ownerGuid = requested.length === 1 ? requested[0] : undefined;
  return { scope: ownerGuid ? { kind: 'facility', facilityGuid: ownerGuid, facilityGuids: included }
    : { kind: 'portfolio', facilityGuids: included }, missingFacilityGuids };
}

export function sameVisualizationFacilitySelection(left: VisualizationFacilitySelection, right: VisualizationFacilitySelection): boolean {
  if (left.kind !== right.kind) return false;
  if (left.kind === 'all') return true;
  if (right.kind !== 'fixed' || left.facilityGuids.length !== right.facilityGuids.length) return false;
  const orderedRight = [...right.facilityGuids].sort();
  return [...left.facilityGuids].sort().every((guid, index) => guid === orderedRight[index]);
}
