import { normalizeVisualizationDefinition, type VisualizationDefinition } from '@domain/visualizations/visualization-definition';

export type VisualizationConflictChoice = 'local' | 'saved';
export type VisualizationConflictChoices = Readonly<Record<string, VisualizationConflictChoice>>;
export interface VisualizationEditConflict {
  readonly id: 'name' | 'title' | 'legend' | 'configuration';
  readonly label: string;
  readonly localValue: unknown;
  readonly savedValue: unknown;
}

export function visualizationIntentEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
  if (Array.isArray(left) || Array.isArray(right)) return Array.isArray(left) && Array.isArray(right)
    && left.length === right.length && left.every((entry, index) => visualizationIntentEqual(entry, right[index]));
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  return [...keys].every(key => visualizationIntentEqual(left[key], right[key]));
}

export function normalizeVisualizationIntent(value: VisualizationDefinition): VisualizationDefinition {
  return normalizeVisualizationDefinition(value);
}

/** Configuration is one group: merging its source/series topology piecemeal can invent meaning. */
export function reconcileVisualizationIntent(base: VisualizationDefinition, local: VisualizationDefinition,
  saved: VisualizationDefinition, choices: VisualizationConflictChoices = {}): {
    readonly value: VisualizationDefinition; readonly baseline: VisualizationDefinition;
    readonly conflicts: readonly VisualizationEditConflict[];
  } {
  const groups = [
    { id: 'name' as const, label: 'Name', get: (value: VisualizationDefinition) => value.name },
    { id: 'title' as const, label: 'Display title', get: (value: VisualizationDefinition) => value.appearance.title },
    { id: 'legend' as const, label: 'Legend', get: (value: VisualizationDefinition) => value.appearance.legend },
    { id: 'configuration' as const, label: 'Facilities, sources, periods, series, and chart settings', get: (value: VisualizationDefinition) => ({
      facilitySelection: value.facilitySelection, sources: value.sources, period: value.period, comparison: value.comparison, series: value.series, chart: value.chart
    }) }
  ];
  const selected = new Map<string, unknown>();
  const baselines = new Map<string, unknown>();
  const conflicts: VisualizationEditConflict[] = [];
  for (const group of groups) {
    const before = group.get(base), mine = group.get(local), theirs = group.get(saved);
    let chosen = theirs, baseline = theirs;
    if (!visualizationIntentEqual(before, mine)) {
      if (visualizationIntentEqual(before, theirs) || visualizationIntentEqual(mine, theirs) || choices[group.id] === 'local') chosen = mine;
      else if (choices[group.id] !== 'saved') {
        chosen = mine; baseline = before;
        conflicts.push({ id: group.id, label: group.label, localValue: mine, savedValue: theirs });
      }
    }
    selected.set(group.id, chosen); baselines.set(group.id, baseline);
  }
  const compose = (values: Map<string, unknown>): VisualizationDefinition => {
    const configuration = values.get('configuration') as Pick<VisualizationDefinition, 'facilitySelection' | 'sources' | 'period' | 'comparison' | 'series' | 'chart'>;
    const { chart: _oldChart, ...owner } = saved;
    const { chart, ...settings } = configuration;
    const title = values.get('title') as string | undefined;
    return structuredClone({ ...owner, ...settings, ...(chart ? { chart } : {}), name: values.get('name') as string,
      appearance: { legend: values.get('legend') as boolean, ...(title !== undefined ? { title } : {}) } });
  };
  return { value: compose(selected), baseline: compose(baselines), conflicts };
}
