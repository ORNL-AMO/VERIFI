import type { VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import type { VisualizationSourceEvidence, VisualizationObservation } from '@domain/visualizations/visualization-source-provider';
import { compositionData, compositionHierarchy, isCompositionChart, sumCompositionObservations, type CompositionChart, type CompositionContribution, type CompositionNode, type VisualizationCompositionEvidence } from '@domain/visualizations/visualization-composition';
import { resolveVisualizationSeries } from '@domain/visualizations/visualization-series';
import type { PreviewDetails } from '../preview/preview-registry';
import { visualizationSeriesStyle } from '../shared/series-style';

export interface CompositionDisplayNode extends CompositionNode {
  readonly amount: number | null;
  readonly percentage: number | null;
  readonly description: string;
}
export interface CompositionModel {
  readonly identity: string;
  readonly title: string;
  readonly period: string;
  readonly unit: string;
  readonly chart: CompositionChart;
  readonly legend: boolean;
  readonly shareLabel: string;
  readonly nodes: readonly CompositionDisplayNode[];
  readonly evidence: VisualizationCompositionEvidence;
  readonly partial: boolean;
  readonly details: PreviewDetails;
}
export const compositionNumber = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 6 });
export const compositionPercent = (value: number | null) => value === null ? 'Unavailable' : value > 0 && value < 1 ? '<1%' : `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
export function compositionObservationText(observation: VisualizationObservation, unit: string): string {
  return observation.state === 'observed' ? `${compositionNumber(observation.value)} ${unit}${observation.partial ? ' · Partial coverage; known values only' : ''} · ${observation.provenance}${observation.notes?.length ? ' · ' + observation.notes.join('; ') : ''}` : `Unavailable · ${observation.reason}`;
}
export function compositionSourceDetails(definition: VisualizationDefinition, evidence: readonly VisualizationSourceEvidence[]): PreviewDetails {
  const resolved = evidence.flatMap(entry => (entry.resolution.state === 'ready' || entry.resolution.state === 'empty') && entry.resolution.resolved ? [entry.resolution.resolved] : []);
  return { caption: `${definition.appearance.title ?? definition.name}: original contributions, periods and provenance`,
    columns: ['Facility / item', 'Source', 'Value / quality', 'Saved value and period'],
    rows: resolved.flatMap(result => [...result.composition?.contributions ?? [], ...result.composition?.residuals ?? []].map(value => [
      [value.categories.facility?.label, value.categories.equipment?.label ?? value.categories.meter?.label ?? value.label].filter(Boolean).join(' / '),
      value.categories.source?.label ?? '', compositionObservationText(value.observation, result.series.find(series => series.id === value.seriesId)?.unit ?? ''), value.details.join(' · ')
    ])) };
}
export function prepareComposition(definition: VisualizationDefinition, evidence: readonly VisualizationSourceEvidence[]): CompositionModel {
  const chart = definition.chart, result = evidence[0]?.resolution;
  if (!isCompositionChart(chart) || result?.state !== 'ready' || !result.resolved.composition) throw new Error('Resolve composition contributions before preparing a chart.');
  const resolved = result.resolved, original = resolved.composition!, unit = resolved.series[0]?.unit ?? '';
  const selected = resolveVisualizationSeries(definition, resolved.series), styles = new Map(selected.map(value => [value.metadata.id, value]));
  const order = new Map(selected.map((value, index) => [value.metadata.id, index]));
  const contributions = original.contributions.filter(value => styles.has(value.seriesId)).sort((left, right) => order.get(left.seriesId)! - order.get(right.seriesId)!).map(value => {
    const style = styles.get(value.seriesId)!;
    const categories = Object.fromEntries(Object.entries(value.categories).map(([level, category]) => [level, category.id === style.metadata.resourceGuid && style.selected.label ? { ...category, label: style.selected.label } : category]));
    return { ...value, categories };
  });
  const composition = { ...original, contributions, residuals: original.residuals?.filter(value => styles.has(value.seriesId)) };
  let nodes: CompositionNode[];
  if (chart.kind === 'treemap' || chart.kind === 'sunburst') nodes = compositionHierarchy(contributions, chart.hierarchy);
  else if (chart.kind === 'breakdown') nodes = selected.map(value => ({ id: value.metadata.id, label: value.selected.label ?? value.metadata.label,
    contributions: contributions.filter(row => row.seriesId === value.metadata.id),
    observation: sumCompositionObservations(contributions.filter(row => row.seriesId === value.metadata.id).map(row => row.observation)), color: value.selected.color ?? visualizationSeriesStyle(value.metadata.id).color }));
  else {
    const flow = compositionData(chart, composition), all = [...contributions, ...composition.residuals ?? []];
    nodes = flow.kind !== 'flow' ? [] : flow.nodes.map(node => {
      const members = all.filter(row => {
        const facility = row.categories.facility?.id, source = row.categories.source?.id;
        const target = chart.flow === 'source-to-equipment' ? row.categories.equipment?.id : row.categories.group?.id;
        return node.id === JSON.stringify(['source', facility, source]) || node.id === JSON.stringify(['target', facility, target]);
      });
      return { ...node, contributions: members, observation: sumCompositionObservations(members.map(value => value.observation)) };
    });
  }
  const selectedTotal = sumCompositionObservations([...contributions, ...composition.residuals ?? []].map(value => value.observation));
  const share = (observation: VisualizationObservation, denominator: VisualizationObservation | undefined): number | null => observation.state === 'observed' && denominator?.state === 'observed' && denominator.value > 0 ? observation.value / denominator.value * 100 : null;
  const source = definition.sources[0], denominatorKind = source?.kind === 'energy-use' ? source.denominator : 'selected';
  const display = nodes.map(node => {
    const facilities = [...new Set(node.contributions.map(value => value.categories.facility?.id).filter(Boolean))];
    const facilityDenominator = facilities.length === 1 ? original.denominators.find(value => value.kind === 'facility' && value.facilityGuid === facilities[0])?.observation : undefined;
    const accountDenominator = definition.facilitySelection.kind === 'all' ? original.denominators.find(value => value.kind === 'account')?.observation : undefined;
    const meteredDenominator = facilities.length === 1 ? original.denominators.find(value => value.kind === 'metered-consumption' && value.facilityGuid === facilities[0])?.observation : undefined;
    const denominator = denominatorKind === 'selected' ? selectedTotal : denominatorKind === 'facility' ? facilityDenominator : denominatorKind === 'account' ? accountDenominator : meteredDenominator;
    const parent = nodes.find(value => value.id === node.parentId)?.observation ?? selectedTotal;
    const quality = [selectedTotal, parent, denominator, facilityDenominator, accountDenominator].some(value => value?.state === 'observed' && value.partial) ? '\nShares use known values only; coverage is partial.' : '';
    const percentages = [`${compositionPercent(share(node.observation, selectedTotal))} of selected contributions`, `${compositionPercent(share(node.observation, parent))} of parent`,
      ...(source.kind === 'energy-use' ? [`${compositionPercent(share(node.observation, facilityDenominator))} of full facility equipment use`, `${compositionPercent(share(node.observation, accountDenominator))} of full account equipment use`,
        ...(meteredDenominator ? [`${compositionPercent(share(node.observation, meteredDenominator))} of metered consumption`] : [])] : [])];
    const style = styles.get(node.contributions[0]?.seriesId);
    return { ...node, color: style?.selected.color ?? node.color ?? visualizationSeriesStyle(node.id).color,
      amount: node.observation.state === 'observed' ? node.observation.value : null, percentage: share(node.observation, denominator),
      description: `${node.label}\n${compositionObservationText(node.observation, unit)}\n${percentages.join('\n')}${quality}` };
  });
  return { identity: JSON.stringify([definition.accountGuid, evidence[0].request.identity.definitionGuid, definition.sources.map(value => value.id)]), title: definition.appearance.title ?? definition.name,
    period: [...new Set(resolved.periods.map(period => `${period.fiscalYear ? 'FY ' + period.fiscalYear + ' · ' : ''}${period.start} – ${period.end}`))].join('; '),
    chart, unit, legend: definition.appearance.legend,
    shareLabel: denominatorKind === 'selected' ? 'selected contributions' : denominatorKind === 'facility' ? 'full facility equipment use' : denominatorKind === 'account' ? 'full account equipment use (All Facilities required)' : 'complete metered site-energy consumption',
    nodes: display, evidence: composition, partial: resolved.quality.partial,
    details: compositionSourceDetails(definition, evidence) };
}

export function compositionFlow(model: CompositionModel) { return compositionData(model.chart, model.evidence); }
