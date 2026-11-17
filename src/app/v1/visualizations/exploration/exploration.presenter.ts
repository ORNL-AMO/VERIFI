import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { Injectable, inject } from '@angular/core';
import type { VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import type { VisualizationSourceEvidence } from '@domain/visualizations/visualization-source-provider';
import { absentObservation, explorationObservationText, prepareExploration } from '@domain/visualizations/visualization-exploration';
import type { PreviewPresentation, VisualizationPreviewPresenter } from '../preview/preview-registry';
import { ExplorationChartComponent } from './chart/exploration-chart.component';

abstract class ExplorationPresenter implements VisualizationPreviewPresenter {
  private readonly workspace = inject(AccountWorkspaceStore, { optional: true });
  abstract readonly kind: 'scatter' | 'correlation' | 'heatmap';
  readonly component = ExplorationChartComponent;
  async prepare(definition: VisualizationDefinition, evidence: readonly VisualizationSourceEvidence[], signal: AbortSignal): Promise<PreviewPresentation> {
    const prepared = await prepareExploration(definition, evidence, signal);
    const snapshot = this.workspace?.snapshot();
    const showFacilities = prepared.facilityGuids.length > 1;
    const facilityName = (guid: string) => snapshot?.facilities.find(facility => facility.guid === guid)?.name?.trim() || 'Unnamed facility';
    const series = prepared.series.map(series => {
      const source = definition.sources.find(source => source.id === series.metadata.sourceId);
      const category = source?.kind === 'utility' ? 'Meters' : source?.kind === 'energy-use' ? 'Energy Uses' : source?.kind === 'analysis' ? 'Analysis results' : 'Predictors';
      const resolved = evidence.find(entry => entry.request.source.id === series.metadata.sourceId)?.resolution;
      const facilityGuids = series.facilityGuid ? [series.facilityGuid]
        : resolved && (resolved.state === 'ready' || resolved.state === 'empty')
          ? [...new Set(resolved.resolved?.references.flatMap(reference => reference.facilityGuid ? [reference.facilityGuid] : []) ?? [])] : [];
      const owner = (facilityGuids.length ? facilityGuids : prepared.facilityGuids).map(facilityName).join(', ');
      return { ...series, label: showFacilities && owner ? `${series.label} · ${owner}` : series.label,
        context: [category, owner, series.metadata.label].filter(Boolean).join(' · ') };
    });
    const byId = new Map(series.map(series => [series.id, series]));
    const model = { ...prepared, series, pairs: prepared.pairs.map(pair => ({ ...pair, x: byId.get(pair.x.id)!, y: byId.get(pair.y.id)! })) };
    return { inputs: { model }, details: { caption: `${model.title}: original observations, provenance and quality`,
      columns: ['Series', 'Start', 'End', 'Original value / quality', 'Standardized value', 'Source context'],
      rows: model.series.flatMap(series => model.slots.map(slot => [series.label, slot.start, slot.end,
        explorationObservationText(series.observations.get(slot.key) ?? absentObservation, series.unit),
        series.standardized.get(slot.key)?.toString() ?? 'Unavailable', series.context])) } };
  }
}
@Injectable() export class CorrelationPresenter extends ExplorationPresenter { readonly kind = 'correlation' as const; }
@Injectable() export class ScatterPresenter extends ExplorationPresenter { readonly kind = 'scatter' as const; }
@Injectable() export class HeatmapPresenter extends ExplorationPresenter { readonly kind = 'heatmap' as const; }
