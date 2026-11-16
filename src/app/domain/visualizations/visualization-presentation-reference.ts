import type { VisualizationResourceKind, VisualizationSource } from './visualization-definition';

/** Only provider-owned formats whose suffix is a domain GUID belong to transfer/scope mapping. */
export function visualizationPresentationReference(source: VisualizationSource | undefined, seriesId: string): {
  readonly kind: VisualizationResourceKind; readonly guid: string; readonly prefix: string;
} | undefined {
  if (source?.kind === 'predictor') {
    const prefix = `${source.id}:predictor:`;
    return seriesId.startsWith(prefix) && seriesId.length > prefix.length
      ? { kind: 'predictor', guid: seriesId.slice(prefix.length), prefix } : undefined;
  }
  if (source?.kind !== 'utility' || !seriesId.startsWith(`${source.id}:`)) return undefined;
  const prefix = `${source.id}:`, suffix = seriesId.slice(prefix.length);
  if (source.groupBy === 'group' && suffix.startsWith('unassigned:') && suffix.length > 'unassigned:'.length)
    return { kind: 'facility', guid: suffix.slice('unassigned:'.length), prefix: `${prefix}unassigned:` };
  const kind = source.groupBy === 'meter' ? 'meter' : source.groupBy === 'group' ? 'meter-group' : source.groupBy === 'facility' ? 'facility' : undefined;
  return kind && suffix && suffix !== 'total' && !suffix.startsWith('source:') && !suffix.startsWith('unassigned:')
    ? { kind, guid: suffix, prefix } : undefined;
}
