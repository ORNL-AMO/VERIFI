import type { VisualizationResourceKind, VisualizationSource } from './visualization-definition';
import { EQUIPMENT_TYPES } from './energy-use/equipment-selection';

export function isEnergyUseTypePresentation(source: VisualizationSource | undefined, seriesId: string): boolean {
  const prefix = `${source?.id}:equipment-type:`;
  return source?.kind === 'energy-use' && source.selectionMode === 'equipment-type' && seriesId.startsWith(prefix)
    && EQUIPMENT_TYPES.some(type => seriesId === `${prefix}${type}`);
}

/** Only provider-owned formats whose suffix is a domain GUID belong to transfer/scope mapping. */
export function visualizationPresentationReference(source: VisualizationSource | undefined, seriesId: string): {
  readonly kind: VisualizationResourceKind; readonly guid: string; readonly prefix: string;
} | undefined {
  if (source?.kind === 'energy-use') {
    for (const kind of ['equipment', 'energy-use-group', 'meter-group', 'facility'] as const) {
      const prefix = `${source.id}:${kind}:`;
      if (seriesId.startsWith(prefix) && seriesId.length > prefix.length) return { kind, guid: seriesId.slice(prefix.length), prefix };
    }
    return undefined;
  }
  if (source?.kind === 'predictor') {
    const kind = 'predictor';
    const prefix = `${source.id}:${kind}:`;
    return seriesId.startsWith(prefix) && seriesId.length > prefix.length
      ? { kind, guid: seriesId.slice(prefix.length), prefix } : undefined;
  }
  if (source?.kind !== 'utility' || !seriesId.startsWith(`${source.id}:`)) return undefined;
  const prefix = `${source.id}:`, suffix = seriesId.slice(prefix.length);
  if (source.groupBy === 'group' && suffix.startsWith('unassigned:') && suffix.length > 'unassigned:'.length)
    return { kind: 'facility', guid: suffix.slice('unassigned:'.length), prefix: `${prefix}unassigned:` };
  const kind = source.groupBy === 'meter' ? 'meter' : source.groupBy === 'group' ? 'meter-group' : source.groupBy === 'facility' ? 'facility' : undefined;
  return kind && suffix && suffix !== 'total' && !suffix.startsWith('source:') && !suffix.startsWith('unassigned:')
    ? { kind, guid: suffix, prefix } : undefined;
}
