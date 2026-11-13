import { inject, Injectable, InjectionToken, Type } from '@angular/core';
import type { VisualizationDefinition, VisualizationSourceKind } from '@domain/visualizations/visualization-definition';
import type { VisualizationChartKind, VisualizationSourceEvidence, VisualizationSourceProvider, VisualizationSourceRequest } from '@domain/visualizations/visualization-source-provider';

/** definitionRevision includes local edit revisions, independently of the persisted record revision. */
export interface PreviewIdentity {
  readonly accountGuid: string;
  readonly workspaceRevision: number;
  readonly definitionGuid: string;
  readonly definitionRevision: number;
}

export type PreviewDateContext = VisualizationSourceRequest['dateContext'];
export interface PreviewDateContextResolver {
  /** Resolve one date context across all sources before any source requests are issued. */
  resolve(definition: VisualizationDefinition, identity: PreviewIdentity, signal: AbortSignal): Promise<PreviewDateContext>;
}

export interface PreviewDetails {
  readonly caption: string;
  readonly columns: readonly string[];
  readonly rows: readonly (readonly string[])[];
}

export interface PreviewPresentation {
  /** Runtime-only presenter inputs; never added to the saved definition. */
  readonly inputs: Record<string, unknown>;
  readonly details: PreviewDetails;
}

export interface VisualizationPreviewPresenter {
  readonly kind: VisualizationChartKind;
  readonly component: Type<unknown>;
  prepare(definition: VisualizationDefinition, evidence: readonly VisualizationSourceEvidence[], signal: AbortSignal):
    PreviewPresentation | Promise<PreviewPresentation>;
}

/** Feature adapters supply calculation and presentation registrations. */
export const VISUALIZATION_SOURCE_PROVIDERS = new InjectionToken<readonly VisualizationSourceProvider[]>(
  'Visualization source providers', { providedIn: 'root', factory: () => [] });
export const VISUALIZATION_PREVIEW_PRESENTERS = new InjectionToken<readonly VisualizationPreviewPresenter[]>(
  'Visualization preview presenters', { providedIn: 'root', factory: () => [] });
export const VISUALIZATION_DATE_CONTEXT_RESOLVER = new InjectionToken<PreviewDateContextResolver | undefined>(
  'Visualization shared date context resolver', { providedIn: 'root', factory: () => undefined });
/** Resolve feature registrations from the injector that imports PreviewModule. */
@Injectable()
export class PreviewRegistry {
  private readonly providers = inject(VISUALIZATION_SOURCE_PROVIDERS);
  private readonly presenters = inject(VISUALIZATION_PREVIEW_PRESENTERS);
  readonly dates = inject(VISUALIZATION_DATE_CONTEXT_RESOLVER);

  provider(kind: VisualizationSourceKind): VisualizationSourceProvider | undefined {
    const matches = this.providers.filter(provider => provider.kind === kind);
    return matches.length === 1 ? matches[0] : undefined;
  }
  presenter(kind: VisualizationChartKind): VisualizationPreviewPresenter | undefined {
    const matches = this.presenters.filter(presenter => presenter.kind === kind);
    return matches.length === 1 ? matches[0] : undefined;
  }

}
