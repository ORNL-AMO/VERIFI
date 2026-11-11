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
    if (copy.kind === 'analysis-result' || copy.kind === 'analysis-model') {
      delete copy.analysisGuid; delete copy.groupGuid;
      if (copy.kind === 'analysis-model') { delete copy.modelId; delete copy.comparisonModelId; }
    }
    return copy;
  });
  let result: VisualizationDefinition = { ...next, sources, series: next.series.filter(series => !affected.has(series.sourceId)) };
  if (result.chart?.kind === 'time-series' && result.chart.seriesTypes) {
    result = { ...result, chart: { ...result.chart, seriesTypes: result.chart.seriesTypes.filter(type => result.series.some(series => series.id === type.seriesId)) } };
  }
  // Scatter axis identities, for example, cannot remain after their series are removed.
  const brokenScatter = result.chart?.kind === 'scatter'
    && (!result.series.some(series => series.id === (result.chart as Extract<VisualizationDefinition['chart'], { kind: 'scatter' }>).xSeriesId)
      || !result.series.some(series => series.id === (result.chart as Extract<VisualizationDefinition['chart'], { kind: 'scatter' }>).ySeriesId));
  if ((brokenScatter || decodeVisualizationDefinition(result).state === 'invalid') && result.chart) {
    cleared.push('Chart configuration that depends on cleared series');
    const { chart, ...withoutChart } = result;
    result = withoutChart;
  }
  const decoded = decodeVisualizationDefinition(result);
  if (decoded.state === 'invalid' || decoded.state === 'unsupported') throw new Error('This definition cannot be safely reset. Its original intent has been preserved.');
  return { definition: result, cleared, referencePaths: issues.filter(issue => issue.path !== 'scope.facilityGuid').map(issue => issue.path) };
}

export function reviewVisualizationScopeCopy(definition: VisualizationDefinition, scope: VisualizationScope,
  catalog: VisualizationReferenceCatalog): VisualizationResetReview {
  const candidate = { ...structuredClone(definition), scope: structuredClone(scope), name: `${definition.name} (Copy)` };
  const issues = inspectVisualizationReferences(candidate, catalog).filter(issue => issue.path !== 'scope.facilityGuid');
  // Rules without explicit anchors intentionally follow the new scope, but this must be reviewed.
  const review = reviewVisualizationReset(candidate, issues);
  return { ...review, cleared: ['New independent identity and explicitly selected scope', ...review.cleared] };
}
