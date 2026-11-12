import { VISUALIZATION_DEFINITION_VERSION, VisualizationDefinition, VisualizationSource, VisualizationSourceKind } from './visualization-definition';

export interface VisualizationIssue {
  readonly path: string;
  readonly code: 'invalid' | 'unsupported' | 'setup-required';
  readonly message: string;
}
export type VisualizationValidationResult =
  | { readonly state: 'invalid' | 'unsupported'; readonly issues: readonly VisualizationIssue[] }
  | { readonly state: 'valid' | 'setup-required'; readonly definition: VisualizationDefinition; readonly issues: readonly VisualizationIssue[] };

type Check = (value: unknown, path: string, issues: VisualizationIssue[]) => void;
const issue = (issues: VisualizationIssue[], path: string, message: string, code: VisualizationIssue['code'] = 'invalid') =>
  issues.push({ path, code, message });
const text: Check = (value, path, issues) => {
  if (typeof value !== 'string' || !value.trim()) issue(issues, path, 'Enter a nonempty string.');
};
const boolean: Check = (value, path, issues) => {
  if (typeof value !== 'boolean') issue(issues, path, 'Expected a boolean.');
};
const positiveInteger: Check = (value, path, issues) => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) issue(issues, path, 'Expected a positive safe integer.');
};
const enumeration = (...values: readonly (string | number)[]): Check => (value, path, issues) => {
  if (!values.includes(value as string | number)) issue(issues, path, `Expected one of: ${values.join(', ')}.`);
};
const array = (check: Check): Check => (value, path, issues) => {
  if (!Array.isArray(value)) { issue(issues, path, 'Expected an array.'); return; }
  value.forEach((entry, index) => check(entry, `${path}[${index}]`, issues));
};
const object = (fields: Readonly<Record<string, Check>>, optional: readonly string[] = []): Check => (value, path, issues) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) { issue(issues, path, 'Expected an object.'); return; }
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) if (!Object.hasOwn(fields, key)) issue(issues, `${path}.${key}`, 'Unknown field; generated or transient state cannot be saved.');
  for (const [key, check] of Object.entries(fields)) {
    if (Object.hasOwn(record, key)) check(record[key], `${path}.${key}`, issues);
    else if (!optional.includes(key)) issue(issues, `${path}.${key}`, 'Required field.');
  }
};
const variant = (variants: Readonly<Record<string, Check>>, unsupported = false, discriminator = 'kind'): Check => (value, path, issues) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) { issue(issues, path, 'Expected a typed object.'); return; }
  const kind = (value as Record<string, unknown>)[discriminator];
  if (typeof kind !== 'string') { issue(issues, `${path}.${discriminator}`, `Expected a ${discriminator}.`); return; }
  if (!Object.hasOwn(variants, kind)) { issue(issues, `${path}.${discriminator}`, `Unsupported ${discriminator}: ${kind}.`, unsupported ? 'unsupported' : 'invalid'); return; }
  variants[kind](value, path, issues);
};
const civilDate: Check = (value, path, issues) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) {
    issue(issues, path, 'Expected an ISO civil date (YYYY-MM-DD).'); return;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) issue(issues, path, 'Expected an existing civil date.');
};
const dateRange = (check: Check): Check => (value, path, issues) => {
  check(value, path, issues);
  const range = value as { start?: unknown; end?: unknown };
  if (range && typeof range.start === 'string' && typeof range.end === 'string' && range.start > range.end)
    issue(issues, path, 'Start must be on or before end.');
};
const binding = (check: Check): Check => variant({
  owner: object({ kind: enumeration('owner') }), pinned: object({ kind: enumeration('pinned'), value: check })
});
const resource = enumeration('facility', 'meter', 'meter-group', 'predictor', 'equipment', 'energy-use-group');
const selection = variant({
  fixed: object({ kind: enumeration('fixed'), resource, guids: array(text) }),
  rule: object({ kind: enumeration('rule'), resource, filter: object({
    facilityGuids: array(text), groupGuids: array(text), utilitySources: array(text), search: text, includeRetired: boolean
  }, ['facilityGuids', 'groupGuids', 'utilitySources', 'search', 'includeRetired']) })
});
const settings = object({ unit: binding(text), energyTreatment: binding(enumeration('site', 'source')) }, ['unit', 'energyTreatment']);
const base = { id: text, settings };
const source = variant({
  utility: object({ ...base, kind: enumeration('utility'), measure: enumeration('energy', 'consumption', 'cost', 'location-emissions', 'market-emissions', 'charge'),
    selection, aggregation: enumeration('none', 'sum'), dataMode: enumeration('billing-period', 'calendarized'),
    groupBy: enumeration('total', 'facility', 'group', 'meter', 'source'),
    charge: object({ meterGuid: text, chargeGuid: text, measure: enumeration('cost', 'usage') }) }, ['settings', 'selection', 'charge']),
  predictor: object({ ...base, kind: enumeration('predictor'), measure: enumeration('value'), selection, aggregation: enumeration('none', 'sum', 'mean') }, ['settings', 'selection']),
  'energy-use': object({ ...base, kind: enumeration('energy-use'), measure: enumeration('consumption', 'cost', 'emissions', 'balance'), selection,
    aggregation: enumeration('none', 'sum'), denominator: enumeration('selected', 'facility', 'account', 'metered-consumption') }, ['settings', 'selection']),
  analysis: variant({
    result: object({ ...base, kind: enumeration('analysis'), mode: enumeration('result'), analysisGuid: text, groupGuid: text,
      measure: enumeration('actual', 'calculated', 'savings', 'losses', 'annual-improvement', 'total-improvement', 'banked-savings', 'banked-losses'),
      aggregation: enumeration('none') }, ['settings', 'analysisGuid', 'groupGuid']),
    model: object({ ...base, kind: enumeration('analysis'), mode: enumeration('model'), analysisGuid: text, groupGuid: text, modelId: text, comparisonModelId: text,
      measure: enumeration('actual', 'modeled', 'residual'), aggregation: enumeration('none') }, ['settings', 'analysisGuid', 'groupGuid', 'modelId', 'comparisonModelId'])
  }, false, 'mode')
}, true);
const basis = enumeration('calendar', 'fiscal');
const period = variant({
  'all-history': object({ kind: enumeration('all-history') }),
  fixed: dateRange(object({ kind: enumeration('fixed'), start: civilDate, end: civilDate, basis })),
  rolling: object({ kind: enumeration('rolling'), count: positiveInteger, unit: enumeration('month', 'year'), anchor: enumeration('latest-data', 'calendar'), basis, includeIncomplete: boolean }),
  'latest-saved-year': object({ kind: enumeration('latest-saved-year'), basis: enumeration('fiscal') }),
  'fiscal-year': object({ kind: enumeration('fiscal-year'), year: (value, path, issues) => {
    positiveInteger(value, path, issues);
    if (typeof value === 'number' && value > 9999) issue(issues, path, 'Fiscal year must be at most 9999.');
  } })
});
const comparison = variant({
  none: object({ kind: enumeration('none') }), 'previous-period': object({ kind: enumeration('previous-period') }),
  'previous-year': object({ kind: enumeration('previous-year'), basis }),
  custom: dateRange(object({ kind: enumeration('custom'), start: civilDate, end: civilDate }))
});
const chart = variant({
  'time-series': object({ kind: enumeration('time-series'), type: enumeration('line', 'bar', 'area', 'combination'), interval: enumeration('monthly', 'yearly', 'native'),
    stack: enumeration('none', 'absolute', 'percent'), seriesTypes: array(object({ seriesId: text, type: enumeration('line', 'bar', 'area') })) }, ['seriesTypes']),
  scatter: object({ kind: enumeration('scatter'), xSeriesId: text, ySeriesId: text, showFit: boolean }, ['xSeriesId', 'ySeriesId']),
  correlation: object({ kind: enumeration('correlation'), statistic: enumeration('r', 'r-squared'), scale: enumeration('raw', 'z-score') }),
  heatmap: object({ kind: enumeration('heatmap'), dimension: enumeration('month-year', 'series-period'), scale: enumeration('linear', 'diverging') }),
  breakdown: object({ kind: enumeration('breakdown'), type: enumeration('bar', 'donut'), values: enumeration('absolute', 'percent') }),
  treemap: object({ kind: enumeration('treemap'), hierarchy: array(enumeration('facility', 'group', 'source', 'equipment')), values: enumeration('absolute', 'percent') }),
  sankey: object({ kind: enumeration('sankey'), flow: enumeration('source-to-equipment', 'source-to-group', 'energy-balance') })
}, true);
const seriesFields = { id: text, sourceId: text, metric: text, resourceGuid: text, label: text, color: text,
  axis: enumeration('left', 'right'), lineStyle: enumeration('solid', 'dashed', 'dotted') };
const seriesOptional = ['resourceGuid', 'label', 'color', 'lineStyle'];
const seriesOverride: Check = (value, path, issues) => {
  object({ resourceGuid: text, seriesId: text, accountGuid: text, label: text, color: text,
    axis: enumeration('left', 'right'), lineStyle: enumeration('solid', 'dashed', 'dotted'), visible: boolean,
    order: (value, path, issues) => {
      if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) issue(issues, path, 'Enter a nonnegative safe integer for explicit series order.');
    } },
    ['resourceGuid', 'seriesId', 'accountGuid', 'label', 'color', 'axis', 'lineStyle', 'visible', 'order'])(value, path, issues);
  if (value && typeof value === 'object') {
    const count = Number(Object.hasOwn(value, 'resourceGuid')) + Number(Object.hasOwn(value, 'seriesId'));
    if (count !== 1) issue(issues, path, 'Choose exactly one resource GUID or provider series identity for a presentation override.');
  }
};
const definition = (version: 1 | 2): Check => object({
  version: enumeration(version), name: text, accountGuid: text,
  scope: variant({ portfolio: object({ kind: enumeration('portfolio') }), facility: object({ kind: enumeration('facility'), facilityGuid: text }) }),
  sources: array(source), period, comparison,
  series: array(version === 1 ? object(seriesFields, seriesOptional)
    : object({ ...seriesFields, visible: boolean, overrides: array(seriesOverride) }, [...seriesOptional, 'visible', 'overrides'])),
  chart, appearance: object({ legend: boolean, title: text }, ['title'])
}, ['chart']);

/** Reject values JSON would silently change or drop before validating their known fields. */
function checkJson(value: unknown, path: string, issues: VisualizationIssue[], ancestors = new Set<object>(), depth = 0): void {
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number' && Number.isFinite(value)) return;
  if (typeof value !== 'object' || depth > 100) { issue(issues, path, 'Expected finite, non-executable JSON data.'); return; }
  if (ancestors.has(value)) { issue(issues, path, 'Cyclic values cannot be saved.'); return; }
  if (Array.isArray(value) ? Object.getPrototypeOf(value) !== Array.prototype
    : ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    issue(issues, path, 'Only plain JSON objects and ordinary arrays can be saved.'); return;
  }
  ancestors.add(value);
  const keys = Reflect.ownKeys(value);
  const isArrayIndex = (key: PropertyKey): boolean => typeof key === 'string' && /^(0|[1-9]\d*)$/.test(key)
    && Number(key) < (value as unknown[]).length;
  if (Array.isArray(value) && keys.filter(isArrayIndex).length !== value.length)
    issue(issues, path, 'Sparse arrays cannot be saved.');
  for (const key of keys) {
    if (Array.isArray(value) && key === 'length') continue;
    if (typeof key !== 'string' || Array.isArray(value) && !isArrayIndex(key)) {
      issue(issues, path, 'JSON cannot preserve this property.'); continue;
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
    if (!descriptor.enumerable || !('value' in descriptor)) issue(issues, `${path}.${key}`, 'Accessors and hidden fields cannot be saved.');
    else checkJson(descriptor.value, `${path}.${key}`, issues, ancestors, depth + 1);
  }
  ancestors.delete(value);
}

function setupIssues(value: VisualizationDefinition): VisualizationIssue[] {
  const issues: VisualizationIssue[] = [];
  const need = (path: string, message: string) => issue(issues, path, message, 'setup-required');
  if (!value.sources.length) need('$.sources', 'Choose a data source.');
  for (const [index, selected] of value.sources.entries()) {
    const path = `$.sources[${index}]`;
    if ('selection' in selected || ['utility', 'predictor', 'energy-use'].includes(selected.kind)) {
      const picked = 'selection' in selected ? selected.selection : undefined;
      if (!picked || picked.kind === 'fixed' && !picked.guids.length) need(`${path}.selection`, 'Select resources or an explicit filter rule.');
      if (picked && !sourceResources(selected.kind).includes(picked.resource)) need(`${path}.selection.resource`, 'Choose a resource kind supported by this source.');
    }
    if (selected.kind === 'analysis' && !selected.analysisGuid) need(`${path}.analysisGuid`, 'Select a saved analysis.');
    if (selected.kind === 'analysis' && selected.mode === 'model' && (!selected.modelId || !selected.groupGuid)) need(path, 'Select a saved group and durable model identity.');
    if (selected.kind === 'utility' && selected.measure === 'charge' && !selected.charge) need(`${path}.charge`, 'Select a meter and charge definition.');
    if (selected.kind === 'utility' && selected.measure !== 'charge' && selected.charge) need(`${path}.charge`, 'Charge settings require the charge measure.');
  }
  if (!value.series.length) need('$.series', 'Choose the series to display.');
  for (const [index, series] of value.series.entries()) if (!value.sources.some(selected => selected.id === series.sourceId))
    need(`$.series[${index}].sourceId`, 'Choose a source declared in this definition.');
  if (!value.chart) need('$.chart', 'Choose a compatible chart.');
  if (value.chart?.kind === 'scatter') for (const id of [value.chart.xSeriesId, value.chart.ySeriesId]) {
    if (!value.series.some(series => series.id === id)) need('$.chart', 'Choose declared X and Y series.');
  }
  if (value.chart?.kind === 'treemap' && (!value.chart.hierarchy.length || new Set(value.chart.hierarchy).size !== value.chart.hierarchy.length))
    need('$.chart.hierarchy', 'Choose non-repeated hierarchy levels.');
  if (value.chart?.kind === 'time-series' && value.chart.seriesTypes?.some(entry => !value.series.some(series => series.id === entry.seriesId)))
    need('$.chart.seriesTypes', 'Choose declared series for combination settings.');
  return issues;
}

function sourceResources(kind: VisualizationSourceKind): readonly string[] {
  return kind === 'utility' ? ['facility', 'meter', 'meter-group'] : kind === 'predictor' ? ['predictor']
    : kind === 'energy-use' ? ['facility', 'equipment', 'energy-use-group'] : [];
}

/** Decode supported versions into current intent without mutation or persistence writes. */
export function decodeVisualizationDefinition(value: unknown): VisualizationValidationResult {
  const issues: VisualizationIssue[] = [];
  checkJson(value, '$', issues);
  if (issues.length) return { state: 'invalid', issues };
  if (value && typeof value === 'object' && !Array.isArray(value) && Object.hasOwn(value, 'version')) {
    const version = (value as { version: unknown }).version;
    if (typeof version === 'number' && Number.isSafeInteger(version) && version > 0 && version !== 1 && version !== VISUALIZATION_DEFINITION_VERSION)
      return { state: 'unsupported', issues: [{ path: '$.version', code: 'unsupported', message: `Unsupported definition version: ${version}.` }] };
  }
  const sourceVersion = (value as { version?: unknown })?.version === 1 ? 1 : VISUALIZATION_DEFINITION_VERSION;
  definition(sourceVersion)(value, '$', issues);
  if (issues.length) return { state: issues.some(entry => entry.code === 'invalid') ? 'invalid' : 'unsupported', issues };
  const decoded: VisualizationDefinition = { ...structuredClone(value as VisualizationDefinition), version: VISUALIZATION_DEFINITION_VERSION };
  for (const [key, entries] of [['sources', decoded.sources], ['series', decoded.series]] as const) {
    const ids = entries.map(entry => entry.id);
    if (new Set(ids).size !== ids.length) issue(issues, `$.${key}`, 'Definition-local IDs must be unique.');
  }
  for (const [index, selected] of decoded.sources.entries()) {
    if ('selection' in selected && selected.selection?.kind === 'fixed' && new Set(selected.selection.guids).size !== selected.selection.guids.length)
      issue(issues, `$.sources[${index}].selection.guids`, 'Fixed selections cannot contain duplicate GUIDs.');
  }
  decoded.series.forEach((series, index) => {
    const keys = (series.overrides ?? []).map(override => JSON.stringify([override.accountGuid ?? decoded.accountGuid,
      override.resourceGuid !== undefined ? 'resource' : 'series', override.resourceGuid ?? override.seriesId]));
    if (new Set(keys).size !== keys.length) issue(issues, `$.series[${index}].overrides`, 'Presentation override selectors must be unique within an account.');
    if (series.resourceGuid && series.overrides?.length) issue(issues, `$.series[${index}].overrides`, 'Resource overrides require a matching-set series.');
  });
  if (issues.length) return { state: 'invalid', issues };
  const incomplete = setupIssues(decoded);
  return { state: incomplete.length ? 'setup-required' : 'valid', definition: decoded, issues: incomplete };
}
