import { VisualizationDefinition, VisualizationScope, VisualizationSource } from '@domain/visualizations/visualization-definition';
import { VisualizationReferenceIssue } from '@domain/visualizations/visualization-references';
import { decodeVisualizationDefinition } from '@domain/visualizations/visualization-validation';
import { inspectVisualizationReferences, VisualizationReferenceCatalog } from '@data/account-workspace/visualization-reference-inspection';

export interface VisualizationResetReview {
  readonly definition: VisualizationDefinition;
  readonly cleared: readonly string[];
  readonly referencePaths: readonly string[];
}

/** Clear a whole affected source identity: never broaden a broken rule or guess a replacement. */
export function reviewVisualizationReset(definition: VisualizationDefinition, issues: readonly VisualizationReferenceIssue[],
  allSources = false): VisualizationResetReview {
  const next = structuredClone(definition);
  const affected = new Set<string>();
  const cleared: string[] = [];
  const sources = next.sources.map((source, index): VisualizationSource => {
    const sourceIssues = issues.some(issue => issue.path.startsWith(`sources.${index}.`)
      || issue.path.startsWith('series.') && definition.series[Number(issue.path.split('.')[1])]?.sourceId === source.id);
    if (!allSources && !sourceIssues) return source;
    affected.add(source.id);
    cleared.push(`${source.kind}: selected resources, rule anchors, and dependent series`);
    const copy = { ...source };
    if ('selection' in copy) delete copy.selection;
    if (copy.kind === 'utility') delete copy.charge;
    if (copy.kind === 'analysis') {
      delete copy.analysisGuid; delete copy.groupGuid;
      if (copy.mode === 'model') { delete copy.modelId; delete copy.comparisonModelId; }
    }
    return copy;
  });
  let result: VisualizationDefinition = { ...next, sources, series: next.series.filter(series => !affected.has(series.sourceId)) };
  if (result.chart?.kind === 'time-series' && result.chart.seriesTypes) {
    result = { ...result, chart: { ...result.chart, seriesTypes: result.chart.seriesTypes.filter(type => result.series.some(series => series.id === type.seriesId)) } };
  }
  // Retain the selected chart while clearing only axes whose declared series were removed.
  if (result.chart?.kind === 'scatter') {
    const chart = { ...result.chart };
    if (chart.xSeriesId && !result.series.some(series => series.id === chart.xSeriesId)) {
      delete chart.xSeriesId; cleared.push('Scatter X axis that depends on cleared series');
    }
    if (chart.ySeriesId && !result.series.some(series => series.id === chart.ySeriesId)) {
      delete chart.ySeriesId; cleared.push('Scatter Y axis that depends on cleared series');
    }
    result = { ...result, chart };
  }
  const decoded = decodeVisualizationDefinition(result);
  if (decoded.state === 'invalid' || decoded.state === 'unsupported') throw new Error('This definition cannot be safely reset. Its original intent has been preserved.');
  return { definition: result, cleared, referencePaths: issues.map(issue => issue.path) };
}

export function reviewVisualizationScopeCopy(definition: VisualizationDefinition, scope: VisualizationScope,
  catalog: VisualizationReferenceCatalog): VisualizationResetReview {
  const candidate = { ...structuredClone(definition), scope: structuredClone(scope), name: `${definition.name} (Copy)` };
  const issues = inspectVisualizationReferences(candidate, catalog).filter(issue => issue.path !== 'scope.facilityGuid');
  // Rules without explicit anchors intentionally follow the new scope, but this must be reviewed.
  const review = reviewVisualizationReset(candidate, issues);
  return { ...review, cleared: ['New independent identity and explicitly selected scope', ...review.cleared] };
}
