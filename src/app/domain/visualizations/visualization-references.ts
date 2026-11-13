import { VisualizationDefinition, VisualizationResourceKind, VisualizationSource } from './visualization-definition';

export type VisualizationReferenceKind = VisualizationResourceKind | 'analysis' | 'model' | 'charge' | 'unknown';

/** Paths address saved intent, not generated labels or definition-local source/series IDs. */
export interface VisualizationReference {
  readonly path: string;
  readonly kind: VisualizationReferenceKind;
  readonly guid: string;
  readonly parentGuid?: string;
  readonly groupGuid?: string;
  /** Cosmetic resource binding: absence never blocks the selected source. */
  readonly optional?: true;
  readonly accountGuid?: string;
}

export interface VisualizationReferenceIssue extends VisualizationReference {
  readonly reason: 'missing' | 'foreign' | 'not-transferred' | 'unclassified';
}

export type VisualizationGuidMaps = Partial<Record<VisualizationReferenceKind, Readonly<Record<string, string>>>>;

/** Model and charge keys include their durable owner because child IDs are not globally unique. */
export function visualizationReferenceKey(ref: VisualizationReference): string {
  return ref.kind === 'model' ? JSON.stringify([ref.parentGuid, ref.groupGuid, ref.guid])
    : ref.kind === 'charge' ? JSON.stringify([ref.parentGuid, ref.guid]) : ref.guid;
}

export function visualizationReferences(definition: VisualizationDefinition): readonly VisualizationReference[] {
  const refs: VisualizationReference[] = [];
  const add = (path: string, kind: VisualizationReferenceKind, guid: string | undefined,
    parentGuid?: string, groupGuid?: string) => {
    if (guid !== undefined) refs.push({ path, kind, guid, ...(parentGuid ? { parentGuid } : {}), ...(groupGuid ? { groupGuid } : {}) });
  };
  if (definition.facilitySelection.kind === 'fixed') definition.facilitySelection.facilityGuids.forEach((guid, index) => add(`facilitySelection.facilityGuids.${index}`, 'facility', guid));
  definition.sources.forEach((source, index) => {
    const path = `sources.${index}`;
    if ('selection' in source && source.selection) {
      const selected = source.selection;
      if (selected.kind === 'fixed') selected.guids.forEach((guid, i) => add(`${path}.selection.guids.${i}`, selected.resource, guid));
      else {
        selected.filter.facilityGuids?.forEach((guid, i) => add(`${path}.selection.filter.facilityGuids.${i}`, 'facility', guid));
        selected.filter.groupGuids?.forEach((guid, i) => add(`${path}.selection.filter.groupGuids.${i}`,
          source.kind === 'energy-use' ? 'energy-use-group' : 'meter-group', guid));
      }
    }
    if (source.kind === 'utility' && source.charge) {
      add(`${path}.charge.meterGuid`, 'meter', source.charge.meterGuid);
      add(`${path}.charge.chargeGuid`, 'charge', source.charge.chargeGuid, source.charge.meterGuid);
    }
    if (source.kind === 'analysis') {
      add(`${path}.analysisGuid`, 'analysis', source.analysisGuid);
      add(`${path}.groupGuid`, 'meter-group', source.groupGuid, source.analysisGuid);
      if (source.mode === 'model') {
        add(`${path}.modelId`, 'model', source.modelId, source.analysisGuid, source.groupGuid);
        add(`${path}.comparisonModelId`, 'model', source.comparisonModelId, source.analysisGuid, source.groupGuid);
      }
    }
  });
  definition.series.forEach((series, i) => {
    const source = definition.sources.find(item => item.id === series.sourceId);
    if (series.resourceGuid) {
      const reference = visualizationSeriesReference(source, series.resourceGuid, definition.facilitySelection);
      add(`series.${i}.resourceGuid`, reference.kind, series.resourceGuid, reference.parentGuid, reference.groupGuid);
    }
    series.overrides?.forEach((override, overrideIndex) => {
      if (override.resourceGuid === undefined) return;
      const reference = visualizationSeriesReference(source, override.resourceGuid, definition.facilitySelection);
      refs.push({ path: `series.${i}.overrides.${overrideIndex}.resourceGuid`, ...reference, guid: override.resourceGuid,
        optional: true, accountGuid: override.accountGuid ?? definition.accountGuid });
    });
  });
  return refs;
}

export function visualizationSeriesReference(source: VisualizationSource | undefined, guid: string, facilities: VisualizationDefinition['facilitySelection']):
  Pick<VisualizationReference, 'kind' | 'parentGuid' | 'groupGuid'> {
  if (source?.kind === 'utility') {
    if (source.groupBy === 'facility') return { kind: 'facility' };
    if (source.groupBy === 'group') return { kind: 'meter-group' };
    if (source.groupBy === 'meter') return { kind: 'meter' };
  }
  if (source?.kind === 'predictor') return { kind: 'predictor' };
  if (source?.kind === 'analysis') {
    if (guid === source.analysisGuid) return { kind: 'analysis' };
    if (guid === source.groupGuid) return { kind: 'meter-group', parentGuid: source.analysisGuid };
    if (source.mode === 'model' && (guid === source.modelId || guid === source.comparisonModelId))
      return { kind: 'model', parentGuid: source.analysisGuid, groupGuid: source.groupGuid };
    if (facilities.kind === 'fixed' && facilities.facilityGuids.includes(guid)) return { kind: 'facility' };
    // Other analysis series may identify a facility or an analysis group. Do not guess the namespace.
    return { kind: 'unknown' };
  }
  if (source && 'selection' in source && source.selection) return { kind: source.selection.resource };
  return { kind: 'unknown' };
}

/** Unmapped references retain their original intent and acquire a durable block, never a guessed target. */
export function remapVisualizationDefinition(definition: VisualizationDefinition, accountGuid: string,
  maps: VisualizationGuidMaps, blocked: readonly VisualizationReferenceIssue[] = []): {
    definition: VisualizationDefinition; issues: readonly VisualizationReferenceIssue[];
  } {
  const result = structuredClone(definition);
  const issues: VisualizationReferenceIssue[] = [];
  // Ordinary category identities are definition-local. The known utility Unassigned
  // category additionally embeds a facility GUID, so preserve its typed transfer boundary.
  definition.series.forEach((series, seriesIndex) => series.overrides?.forEach((override, overrideIndex) => {
    if (override.seriesId === undefined) return;
    const owner = override.accountGuid ?? definition.accountGuid;
    if (owner !== definition.accountGuid) return; // Foreign appearances must never reconnect.
    const path = `series.${seriesIndex}.overrides.${overrideIndex}`;
    const source = definition.sources.find(source => source.id === series.sourceId);
    const prefix = source?.kind === 'utility' ? `${source.id}:` : undefined;
    const suffix = prefix && override.seriesId.startsWith(prefix) ? override.seriesId.slice(prefix.length) : undefined;
    const unassigned = source?.kind === 'utility' && source.groupBy === 'group' && suffix?.startsWith('unassigned:')
      ? suffix.slice('unassigned:'.length) : undefined;
    // Resource-bearing utility IDs follow the same namespace as explicit GUID selectors.
    // Source and total categories retain provider-local identity; unknown providers are opaque.
    const resource = source?.kind === 'utility' && ['meter', 'group', 'facility'].includes(source.groupBy) && suffix && suffix !== 'total' && !suffix.startsWith('source:')
      && !suffix.startsWith('unassigned:') ? visualizationSeriesReference(source, suffix, definition.facilitySelection) : undefined;
    const kind = unassigned ? 'facility' : resource?.kind;
    const guid = unassigned ?? (resource && resource.kind !== 'unknown' ? suffix : undefined);
    if (guid && kind) {
      const map = maps[kind];
      const mapped = map && Object.hasOwn(map, guid) ? map[guid] : undefined;
      if (mapped) {
        setPath(result, `${path}.seriesId`, `${prefix}${unassigned ? 'unassigned:' : ''}${mapped}`);
        setPath(result, `${path}.accountGuid`, accountGuid);
      } else setPath(result, `${path}.accountGuid`, owner);
    } else setPath(result, `${path}.accountGuid`, accountGuid);
  }));
  for (const ref of visualizationReferences(definition)) {
    const existing = blocked.find(item => item.path === ref.path);
    const map = maps[ref.kind];
    const key = visualizationReferenceKey(ref);
    const local = !ref.optional || ref.accountGuid === definition.accountGuid;
    const mapped = !existing && local && map && Object.hasOwn(map, key) ? map[key] : undefined;
    if (mapped) setPath(result, ref.path, mapped);
    if (ref.optional) {
      // Keep unmapped presentation intent qualified to its original owner, never retargeted.
      setPath(result, ref.path.replace(/resourceGuid$/, 'accountGuid'), mapped ? accountGuid : ref.accountGuid!);
    } else if (!mapped) issues.push(existing ?? { ...ref, reason: ref.kind === 'unknown' ? 'unclassified' : 'not-transferred' });
  }
  // Native charge metrics include the durable charge identity as well as its
  // measure. Keep that selector attached to the transferred source, while
  // leaving unknown metrics and blocked charge references untouched.
  definition.series.forEach((series, index) => {
    const sourceIndex = definition.sources.findIndex(source => source.id === series.sourceId);
    const source = definition.sources[sourceIndex];
    const mapped = result.sources[sourceIndex];
    if (source?.kind === 'utility' && source.measure === 'charge' && source.charge &&
      mapped?.kind === 'utility' && mapped.charge &&
      series.metric === `charge:${source.charge.chargeGuid}:${source.charge.measure}`) {
      setPath(result, `series.${index}.metric`, `charge:${mapped.charge.chargeGuid}:${mapped.charge.measure}`);
    }
  });
  return { definition: { ...result, accountGuid }, issues };
}

function setPath(target: unknown, path: string, value: string): void {
  const parts = path.split('.');
  let parent = target as Record<string, unknown>;
  for (const part of parts.slice(0, -1)) parent = parent[part] as Record<string, unknown>;
  parent[parts[parts.length - 1]] = value;
}
