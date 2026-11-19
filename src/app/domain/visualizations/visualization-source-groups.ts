import type { VisualizationDefinition, VisualizationDisplaySettings, VisualizationSource, VisualizationSourceKind } from './visualization-definition';
import { ConvertValue } from '@domain/calculations/conversions/convertValue';

type Projection = Pick<VisualizationSource, 'id' | 'measure'> & { readonly targetId?: string; readonly charge?: unknown };
export interface VisualizationSourceGroup {
  readonly id: VisualizationSourceKind;
  readonly kind: VisualizationSourceKind;
  readonly selection: Readonly<Record<string, unknown>>;
  readonly measures: readonly string[];
  readonly projections: readonly Projection[];
  readonly targets?: readonly Readonly<Record<string, unknown>>[];
}
/** Durable source selections are stored once; providers consume a typed projection per measure/target. */
export interface SavedVisualizationDefinition extends Omit<VisualizationDefinition, 'sources'> {
  readonly sources: readonly VisualizationSourceGroup[];
  readonly projectionOrder: readonly string[];
}

const jsonEqual = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
export function sourceSelection(source: VisualizationSource): Record<string, unknown> {
  const { id: _id, kind: _kind, measure: _measure, settings: _settings, ...selection } = source;
  if (source.kind === 'analysis') return { aggregation: 'none' };
  if (source.kind === 'utility') delete (selection as Record<string, unknown>)['charge'];
  return selection;
}

export function serializeVisualizationDefinition(definition: VisualizationDefinition): SavedVisualizationDefinition {
  const displaySettings: VisualizationDisplaySettings = structuredClone(definition.displaySettings ?? {});
  const units = { ...displaySettings.units };
  let energyTreatment = displaySettings.energyTreatment;
  for (const source of definition.sources) {
    const unit = source.settings?.unit;
    if (unit?.kind === 'pinned') {
      const quantity = new ConvertValue(undefined, '', '').getUnit(unit.value)?.measure;
      if (quantity && !units[quantity]) units[quantity] = unit;
    }
    if ((source.kind === 'utility' && source.measure === 'energy' || source.kind === 'energy-use') && !units['energy']) units['energy'] = { kind: 'owner' };
    if (source.kind === 'utility' && source.measure === 'energy' && !energyTreatment) energyTreatment = source.settings?.energyTreatment ?? { kind: 'owner' };
  }
  const sources: VisualizationSourceGroup[] = [];
  for (const kind of new Set(definition.sources.map(source => source.kind))) {
    const members = definition.sources.filter(source => source.kind === kind);
    const selection = sourceSelection(members[0]);
    if (members.some(source => !jsonEqual(sourceSelection(source), selection))) throw new Error(`All ${kind} measures must share one resource selection and observation setup.`);
    const targets: Record<string, unknown>[] = [];
    const projections = members.map(source => {
      if (source.kind !== 'analysis') return { id: source.id, measure: source.measure, ...(source.kind === 'utility' && source.charge ? { charge: source.charge } : {}) };
      const { id: _id, kind: _kind, measure: _measure, settings: _settings, aggregation: _aggregation, ...binding } = source;
      let target = targets.find(item => jsonEqual(item['binding'], binding));
      if (!target) { target = { id: `target-${targets.length + 1}`, binding }; targets.push(target); }
      return { id: source.id, measure: source.measure, targetId: target['id'] as string };
    });
    sources.push({ id: kind, kind, selection, measures: [...new Set(members.map(source => source.measure))], projections,
      ...(targets.length ? { targets } : {}) });
  }
  return { ...structuredClone(definition), sources, projectionOrder: definition.sources.map(source => source.id),
    displaySettings: { ...(Object.keys(units).length ? { units } : {}), ...(energyTreatment ? { energyTreatment } : {}) } };
}

/** Current-format expansion only. This is not a legacy decoder or a data migration. */
export function expandVisualizationDefinition(value: unknown): unknown {
  if (!value || typeof value !== 'object' || !Object.hasOwn(value, 'projectionOrder')) return value;
  const record = value as SavedVisualizationDefinition;
  if (!Array.isArray(record.sources) || !Array.isArray(record.projectionOrder)) throw new Error('Invalid source groups.');
  const ids = new Set<string>(), kinds = new Set<string>();
  const expanded: VisualizationSource[] = [];
  for (const group of record.sources) {
    if (!group || Object.keys(group).some(key => !['id', 'kind', 'selection', 'measures', 'projections', 'targets'].includes(key))
      || group.id !== group.kind || kinds.has(group.kind) || !Array.isArray(group.measures) || !Array.isArray(group.projections)
      || !group.selection || typeof group.selection !== 'object') throw new Error('Choose one valid source group per category.');
    if (Object.keys(group.selection).some(key => ['id', 'kind', 'measure', 'settings', 'charge'].includes(key))) throw new Error('Source selection contains projection-only settings.');
    if (group.kind !== 'analysis' && group.targets !== undefined) throw new Error('Only Analysis sources have saved result targets.');
    if (group.targets !== undefined && (!Array.isArray(group.targets) || new Set(group.targets.map(target => target?.['id'])).size !== group.targets.length
      || group.targets.some(target => !target || Object.keys(target).some(key => !['id', 'binding'].includes(key)) || typeof target['id'] !== 'string' || !target['id']
        || !target['binding'] || typeof target['binding'] !== 'object' || Array.isArray(target['binding'])
        || Object.keys(target['binding']).some(key => !['mode', 'analysisGuid', 'groupGuid', 'modelId', 'comparisonModelId', 'reporting'].includes(key))))) throw new Error('Choose unique, valid saved Analysis targets.');
    kinds.add(group.kind);
    if (new Set(group.measures).size !== group.measures.length || !group.projections.length) throw new Error('Choose unique measures and source projections.');
    const configured = new Set<string>();
    for (const projection of group.projections) {
      if (!projection || Object.keys(projection).some(key => !['id', 'measure', 'targetId', 'charge'].includes(key)) || ids.has(projection.id)
        || !group.measures.includes(projection.measure)) throw new Error('Invalid or duplicate source projection.');
      if (typeof projection.id !== 'string' || !projection.id || group.kind !== 'analysis' && projection.targetId !== undefined) throw new Error('Invalid projection identity or target.');
      ids.add(projection.id);
      const target = group.targets?.find(target => target['id'] === projection.targetId);
      if (group.kind === 'analysis' && !target) throw new Error('Choose a saved analysis target.');
      const key = `${projection.targetId ?? ''}:${projection.measure}:${JSON.stringify(projection.charge ?? '')}`;
      if (configured.has(key)) throw new Error('A resource/measure combination can be configured only once.');
      configured.add(key);
      const units = record.displaySettings?.units ?? {};
      const unit = group.kind === 'energy-use' || group.kind === 'utility' && projection.measure === 'energy' ? units['energy'] : undefined;
      const settings = group.kind === 'analysis' ? undefined : group.kind === 'utility' && (projection.measure === 'cost' || projection.measure === 'charge') ? {}
        : { unit: unit ?? { kind: 'owner' as const }, ...(group.kind === 'utility' && projection.measure === 'energy' ? { energyTreatment: record.displaySettings?.energyTreatment ?? { kind: 'owner' as const } } : {}) };
      expanded.push({ ...group.selection, ...(target?.['binding'] as object ?? {}), kind: group.kind, id: projection.id, measure: projection.measure,
        ...(settings ? { settings } : {}), ...(projection.charge ? { charge: projection.charge } : {}) } as VisualizationSource);
    }
    if (group.measures.some(measure => !group.projections.some(projection => projection.measure === measure))) throw new Error('A selected measure has no projection.');
    if (group.kind === 'analysis' && group.targets?.some(target => group.measures.some(measure => !group.projections.some(p => p.targetId === target['id'] && p.measure === measure))))
      throw new Error('Each selected analysis target must include every selected measure.');
  }
  if (record.projectionOrder.length !== ids.size || new Set(record.projectionOrder).size !== ids.size || record.projectionOrder.some(id => !ids.has(id))) throw new Error('Invalid projection order.');
  const { projectionOrder, ...base } = record;
  return { ...base, sources: projectionOrder.map(id => expanded.find(source => source.id === id)!) };
}
