import { Injectable } from '@angular/core';
import type { VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import type { VisualizationSourceEvidence } from '@domain/visualizations/visualization-source-provider';
import type { PreviewPresentation, VisualizationPreviewPresenter } from '../preview/preview-registry';
import { CompositionChartComponent } from './chart/composition-chart.component';
import { prepareComposition } from './composition.models';

abstract class CompositionPresenter implements VisualizationPreviewPresenter {
  abstract readonly kind: 'breakdown' | 'treemap' | 'sunburst' | 'sankey';
  readonly component = CompositionChartComponent;
  prepare(definition: VisualizationDefinition, evidence: readonly VisualizationSourceEvidence[], signal: AbortSignal): PreviewPresentation {
    if (signal.aborted) throw new Error('Composition canceled.');
    const model = prepareComposition(definition, evidence); return { inputs: { model }, details: model.details };
  }
}
@Injectable() export class BreakdownPresenter extends CompositionPresenter { readonly kind = 'breakdown' as const; }
@Injectable() export class TreemapPresenter extends CompositionPresenter { readonly kind = 'treemap' as const; }
@Injectable() export class SunburstPresenter extends CompositionPresenter { readonly kind = 'sunburst' as const; }
@Injectable() export class SankeyPresenter extends CompositionPresenter { readonly kind = 'sankey' as const; }
