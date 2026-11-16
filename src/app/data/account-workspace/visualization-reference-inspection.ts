import { resolveVisualizationFacilities } from '@domain/visualizations/visualization-facilities';
import { VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { VisualizationReference, VisualizationReferenceIssue, visualizationReferences } from '@domain/visualizations/visualization-references';
import type { IndexedDbTransactionContext } from '@data/indexedDB/indexed-db-transaction.service';
import type { VerifiStoreName } from '@data/indexedDB/indexed-db-schema';

export const VISUALIZATION_CATALOG_STORES: readonly VerifiStoreName[] = ['facilities', 'utilityMeter', 'utilityMeterGroups', 'predictor',
  'facilityEnergyUseGroups', 'facilityEnergyUseEquipment', 'analysisItems', 'accountAnalysisItems'];

export interface VisualizationCatalogResource {
  readonly guid: string;
  readonly accountId: string;
  readonly facilityId?: string;
}

export interface VisualizationReferenceCatalog {
  readonly facilities: readonly VisualizationCatalogResource[];
  readonly meters: readonly (VisualizationCatalogResource & { readonly charges?: readonly { readonly guid: string }[] })[];
  readonly meterGroups: readonly VisualizationCatalogResource[];
  readonly predictors: readonly VisualizationCatalogResource[];
  readonly energyUseGroups: readonly VisualizationCatalogResource[];
  readonly energyUseEquipment: readonly VisualizationCatalogResource[];
  readonly facilityAnalyses: readonly (VisualizationCatalogResource & {
    readonly groups?: readonly { readonly idbGroupId: string; readonly models?: readonly { readonly modelId: string }[] }[];
  })[];
  readonly accountAnalyses: readonly VisualizationCatalogResource[];
}

/** Call only with these stores participating in the caller's native transaction. */
export async function readVisualizationReferenceCatalog(tx: IndexedDbTransactionContext): Promise<VisualizationReferenceCatalog> {
  const [facilities, meters, meterGroups, predictors, energyUseGroups, energyUseEquipment, facilityAnalyses, accountAnalyses]
    = await Promise.all(VISUALIZATION_CATALOG_STORES.map(store => tx.getAll<any>(store)));
  return { facilities, meters, meterGroups, predictors, energyUseGroups, energyUseEquipment, facilityAnalyses, accountAnalyses };
}

/** No calculations, weather retrieval, label matching, or mutation. Missing sources remain exact GUID intent. */
export function inspectVisualizationReferences(definition: VisualizationDefinition, catalog: VisualizationReferenceCatalog,
  preserved: readonly VisualizationReferenceIssue[] = []): readonly VisualizationReferenceIssue[] {
  const included = new Set(resolveVisualizationFacilities(definition, catalog.facilities).scope.facilityGuids);
  return visualizationReferences(definition).filter(ref => !ref.optional).flatMap(ref => {
    const blocked = preserved.find(item => item.path === ref.path);
    if (blocked) return [blocked];
    const resource = findReference(ref, catalog);
    const foreign = resource && (resource.accountId !== definition.accountGuid
      || (ref.kind === 'facility' ? !included.has(resource.guid) : resource.facilityId !== undefined && !included.has(resource.facilityId)));
    if (foreign) return [{ ...ref, reason: 'foreign' as const }];
    return resource ? [] : [{ ...ref, reason: ref.kind === 'unknown' ? 'unclassified' as const : 'missing' as const }];
  });
}

function findReference(ref: VisualizationReference, catalog: VisualizationReferenceCatalog): VisualizationCatalogResource | undefined {
  const byGuid = (items: readonly VisualizationCatalogResource[]) => items.find(item => item.guid === ref.guid);
  switch (ref.kind) {
    case 'facility': return byGuid(catalog.facilities);
    case 'meter': return byGuid(catalog.meters);
    case 'meter-group': {
      if (ref.parentGuid && !catalog.facilityAnalyses.some(analysis => analysis.guid === ref.parentGuid
        && analysis.groups?.some(group => group.idbGroupId === ref.guid))) return undefined;
      return byGuid(catalog.meterGroups);
    }
    case 'predictor': return byGuid(catalog.predictors);
    case 'equipment': return byGuid(catalog.energyUseEquipment);
    case 'energy-use-group': return byGuid(catalog.energyUseGroups);
    case 'analysis': return byGuid([...catalog.facilityAnalyses, ...catalog.accountAnalyses]);
    case 'charge': return catalog.meters.find(meter => meter.guid === ref.parentGuid && meter.charges?.some(charge => charge.guid === ref.guid));
    case 'model': return catalog.facilityAnalyses.find(analysis => analysis.guid === ref.parentGuid
      && analysis.groups?.some(group => group.idbGroupId === ref.groupGuid && group.models?.some(model => model.modelId === ref.guid)));
    default: return undefined;
  }
}
