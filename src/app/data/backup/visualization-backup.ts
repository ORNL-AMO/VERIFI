import { AnalysisGroup } from '@data/models/analysis';
import { IdbFacility } from '@data/models/idbModels/facility';
import { normalizeAnalysisGroupForAvailablePredictors } from '@shared/shared-analysis/calculations/regression-model-recovery';
import { BackupFile } from '@data/models/backup-file';
import { IdbSavedVisualization, SAVED_VISUALIZATION_RECORD_VERSION } from '@data/models/idbModels/savedVisualization';
import { decodeVisualizationDefinition } from '@domain/visualizations/visualization-validation';
import { remapVisualizationDefinition, VisualizationGuidMaps, VisualizationReferenceKind, visualizationReferenceKey } from '@domain/visualizations/visualization-references';

export interface VisualizationImportSummary {
  readonly accountGuid: string;
  readonly total: number;
  readonly locked: number;
  readonly repairRequired: number;
  readonly reasons: readonly string[];
}

/** Imported arrays retain source order; compare against the immutable prepared input, never names. */
export function visualizationTransferMaps(source: BackupFile, imported: BackupFile): VisualizationGuidMaps {
  const maps: Partial<Record<VisualizationReferenceKind, Record<string, string>>> = {};
  const add = (kind: VisualizationReferenceKind, oldId: string, newId: string) => {
    if (oldId && newId) (maps[kind] ??= Object.create(null))[oldId] = newId;
  };
  const mapRecords = (kind: VisualizationReferenceKind, oldRecords: readonly { guid: string }[], newRecords: readonly { guid: string }[]) => {
    oldRecords.forEach((record, index) => add(kind, record.guid, newRecords[index]?.guid));
  };
  mapRecords('facility', source.backupFileType === 'Account' ? source.facilities : [source.facility],
    imported.backupFileType === 'Account' ? imported.facilities : [imported.facility]);
  mapRecords('meter', source.meters, imported.meters);
  mapRecords('meter-group', source.groups, imported.groups);
  mapRecords('predictor', source.predictors, imported.predictors);
  mapRecords('equipment', source.facilityEnergyUseEquipment, imported.facilityEnergyUseEquipment);
  mapRecords('energy-use-group', source.facilityEnergyUseGroups, imported.facilityEnergyUseGroups);
  mapRecords('analysis', source.facilityAnalysisItems, imported.facilityAnalysisItems);
  mapRecords('analysis', source.accountAnalysisItems, imported.accountAnalysisItems);
  source.meters.forEach((meter, index) => {
    for (const charge of meter.charges ?? []) {
      if (imported.meters[index]?.charges?.some(candidate => candidate.guid === charge.guid)) {
        add('charge', visualizationReferenceKey({ path: '', kind: 'charge', guid: charge.guid, parentGuid: meter.guid }), charge.guid);
      }
    }
  });
  source.facilityAnalysisItems.forEach((analysis, index) => {
    for (const group of analysis.groups ?? []) {
      const importedGroupGuid = maps['meter-group']?.[group.idbGroupId];
      const importedGroup = imported.facilityAnalysisItems[index]?.groups?.find(candidate => candidate.idbGroupId === importedGroupGuid);
      for (const model of group.models ?? []) {
        if (importedGroup?.models?.some(candidate => candidate.modelId === model.modelId)) {
          add('model', visualizationReferenceKey({ path: '', kind: 'model', guid: model.modelId,
            parentGuid: analysis.guid, groupGuid: group.idbGroupId }), model.modelId);
        }
      }
    }
  });
  return maps;
}

/** Each source namespace contributes once to a selected-facility batch. Ambiguity must not choose a target. */
export function mergeVisualizationTransferMaps(all: readonly VisualizationGuidMaps[]): VisualizationGuidMaps {
  const result: Partial<Record<VisualizationReferenceKind, Record<string, string>>> = {};
  for (const maps of all) {
    for (const [kind, entries] of Object.entries(maps)) {
      const merged = result[kind] ??= Object.create(null);
      for (const [source, target] of Object.entries(entries)) {
        if (Object.hasOwn(merged, source) && merged[source] !== target) throw new Error('A visualization source has ambiguous transfer identities.');
        merged[source] = target;
      }
    }
  }
  return result;
}

export function transferSavedVisualization(record: Readonly<IdbSavedVisualization>, accountGuid: string,
  maps: VisualizationGuidMaps, guid: string): IdbSavedVisualization {
  const result: IdbSavedVisualization = { ...structuredClone(record) };
  delete result.id;
  result.guid = guid;
  result.accountId = accountGuid;
  result.revision = 1;
  const decoded = decodeVisualizationDefinition(record.definition);
  const locked = record.preservation?.locked || record.recordVersion !== SAVED_VISUALIZATION_RECORD_VERSION
    || decoded.state === 'invalid' || decoded.state === 'unsupported';
  const transfers = [...(record.preservation?.transfers ?? []), { accountId: record.accountId, targetAccountId: accountGuid, maps: structuredClone(maps) }];
  if (locked || !('definition' in decoded)) {
    if (record.facilityId !== undefined) {
      const mapped = Object.hasOwn(maps.facility ?? {}, record.facilityId) ? maps.facility[record.facilityId] : undefined;
      if (!mapped) throw new Error('A visualization owning facility was not transferred.');
      result.facilityId = mapped;
    }
    result.preservation = { locked: true, references: record.preservation?.references ?? [], transfers };
  } else {
    const remapped = remapVisualizationDefinition(decoded.definition, accountGuid, maps, record.preservation?.references ?? []);
    result.definition = remapped.definition;
    delete result.facilityId;
    result.preservation = { references: remapped.issues, transfers };
  }
  return result;
}

export function summarizeVisualizationImport(accountGuid: string, records: readonly IdbSavedVisualization[]): VisualizationImportSummary {
  const locked = records.filter(record => record.preservation?.locked).length;
  const repairRequired = records.filter(record => !record.preservation?.locked && record.preservation?.references.length).length;
  const reasons = new Set<string>();
  if (locked) reasons.add('Some saved definitions could not be read and remain preserved but locked until their source relationships are verified.');
  if (repairRequired) reasons.add('Some saved visualizations contain missing, excluded, or out-of-scope sources and require explicit repair.');
  return { accountGuid, total: records.length, locked, repairRequired, reasons: [...reasons] };
}

/** Retain verified saved models pinned by known definitions or potentially referenced by opaque definitions. */
export function normalizeVisualizationAnalysisGroup(group: AnalysisGroup, analysisGuid: string, predictorGuids: ReadonlySet<string>,
  facility: IdbFacility | undefined, baselineYear: number | undefined, visualizations: readonly Readonly<IdbSavedVisualization>[]): AnalysisGroup {
  const normalized = normalizeAnalysisGroupForAvailablePredictors(structuredClone(group), predictorGuids, facility, baselineYear).group;
  // An opaque definition may pin any saved model; do not discard its possible sources during export/preparation.
  const opaque = visualizations.some(record => record.preservation?.locked || record.recordVersion !== SAVED_VISUALIZATION_RECORD_VERSION
    || !('definition' in decodeVisualizationDefinition(record.definition)));
  const protectedModelIds = new Set(visualizations.flatMap(record => {
    if (record.preservation?.locked) return [];
    const decoded = decodeVisualizationDefinition(record.definition);
    if (!('definition' in decoded)) return [];
    return decoded.definition.sources.flatMap(source => source.kind === 'analysis' && source.mode === 'model'
      && source.analysisGuid === analysisGuid && source.groupGuid === group.idbGroupId
      ? [source.modelId, source.comparisonModelId].filter(Boolean) : []);
  }));
  const models = [...(normalized.models ?? [])];
  for (const candidate of group.models ?? []) {
    if ((!opaque && !protectedModelIds.has(candidate.modelId)) || models.some(model => model.modelId === candidate.modelId)) continue;
    const verified = normalizeAnalysisGroupForAvailablePredictors({ ...structuredClone(group), selectedModelId: candidate.modelId },
      predictorGuids, facility, baselineYear).group.models?.find(model => model.modelId === candidate.modelId);
    if (verified) models.push(verified);
  }
  return { ...normalized, models: models.length ? models : normalized.models };
}
