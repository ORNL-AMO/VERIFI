import { inject, Injectable, signal, Type } from '@angular/core';
import { checkVisualizationCompatibility } from '@domain/visualizations/visualization-capabilities';
import { VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { decodeVisualizationDefinition } from '@domain/visualizations/visualization-validation';
import { isCurrentVisualizationResponse, VisualizationSourceEvidence, VisualizationSourceRequest } from '@domain/visualizations/visualization-source-provider';
import { PreviewIdentity, PreviewPresentation, PreviewRegistry } from './preview-registry';

export type PreviewState =
  | { readonly state: 'inactive' | 'setup-required' | 'invalid' | 'unsupported' | 'loading' | 'empty' | 'missing-source' | 'error' | 'incompatible'; readonly message: string; readonly reasons?: readonly string[] }
  | { readonly state: 'ready'; readonly message: string; readonly component: Type<unknown>; readonly presentation: PreviewPresentation;
      readonly definition: VisualizationDefinition; readonly evidence: readonly VisualizationSourceEvidence[] };

let nextPreviewId = 0;

/** Preview lifetime and evidence are independent of persistence and autosave acknowledgements. */
@Injectable()
export class PreviewController {
  private readonly instanceId = ++nextPreviewId;
  private readonly registry = inject(PreviewRegistry);
  private readonly value = signal<PreviewState>({ state: 'inactive', message: 'Preview is inactive.' });
  readonly state = this.value.asReadonly();
  private generation = 0;
  private abort?: AbortController;
  private context?: { definition?: VisualizationDefinition; identity?: PreviewIdentity; active: boolean };
  private destroyed = false;

  update(definition: VisualizationDefinition | undefined, identity: PreviewIdentity | undefined, active = true): void {
    this.cancel();
    if (this.destroyed) return;
    this.context = { definition: definition ? structuredClone(definition) : undefined, identity: identity ? { ...identity } : undefined, active };
    if (!active) { this.value.set({ state: 'inactive', message: 'Preview is inactive.' }); return; }
    if (!definition || !identity) { this.value.set({ state: 'setup-required', message: 'Open a saved visualization to preview it.' }); return; }
    const decoded = decodeVisualizationDefinition(this.context.definition);
    if (decoded.state !== 'valid') {
      this.value.set({ state: decoded.state === 'unsupported' ? 'unsupported' : decoded.state === 'invalid' ? 'invalid' : 'setup-required',
        message: decoded.state === 'setup-required' ? 'Complete source and chart setup to preview this visualization.' : 'This saved configuration cannot be previewed.',
        reasons: decoded.issues.map(issue => issue.message) });
      return;
    }
    if (identity.accountGuid !== decoded.definition.accountGuid || !identity.definitionGuid.trim()) {
      this.value.set({ state: 'invalid', message: 'The preview does not belong to the current saved account and visualization.' }); return;
    }
    const providers = decoded.definition.sources.map(source => this.registry.provider(source.kind));
    const presenter = this.registry.presenter(decoded.definition.chart!.kind);
    if (providers.some(provider => !provider) || !presenter || !this.registry.dates) {
      this.value.set({ state: 'unsupported', message: 'Preview support for these sources and chart settings is not available yet. Your saved setup is preserved.' }); return;
    }
    const abort = this.abort = new AbortController();
    const generation = this.generation;
    this.value.set({ state: 'loading', message: 'Preparing current preview…' });
    void this.resolve(decoded.definition, this.context.identity!, generation, abort);
  }

  retry(): void {
    const context = this.context;
    if (context && !this.destroyed) this.update(context.definition, context.identity, context.active);
  }

  destroy(): void { this.destroyed = true; this.cancel(); }

  private cancel(): void { this.generation++; this.abort?.abort(); this.abort = undefined; }
  private current(generation: number, abort: AbortController): boolean {
    return !this.destroyed && generation === this.generation && !abort.signal.aborted && this.context?.active === true;
  }

  private async resolve(definition: VisualizationDefinition, identity: PreviewIdentity, generation: number, abort: AbortController): Promise<void> {
    try {
      const dateContext = Object.freeze({ ...await this.registry.dates!.resolve(definition, identity, abort.signal) });
      if (!this.current(generation, abort)) return;
      if (!civilDate(dateContext.calendarDate) || dateContext.latestDataDate !== undefined && !civilDate(dateContext.latestDataDate)
        || definition.period.kind === 'rolling' && definition.period.anchor === 'latest-data' && !dateContext.latestDataDate) {
        this.value.set({ state: 'incompatible', message: 'Resolve a real shared calendar date and any required latest-data anchor before previewing.' }); return;
      }
      const requestId = `visualization-preview-${this.instanceId}-${generation}`;
      const evidence = await Promise.all(definition.sources.map(async source => {
        const provider = this.registry.provider(source.kind)!;
        const chartSupport = provider.supportsChart(source, definition.chart!);
        const capabilities = provider.describe(source);
        const request: VisualizationSourceRequest = { identity: { ...identity, requestId, scope: definition.scope, sourceId: source.id },
          source, chart: definition.chart!, period: definition.period, comparison: definition.comparison,
          series: definition.series.filter(series => series.sourceId === source.id), dateContext };
        // Unsupported transformations are not a request to perform a different calculation.
        const resolution = chartSupport.state === 'unsupported'
          ? { state: 'unsupported' as const, identity: request.identity, message: chartSupport.reasons.join(' ') }
          : await provider.resolve(request, abort.signal);
        return { request, capabilities, chartSupport, resolution } satisfies VisualizationSourceEvidence;
      }));
      if (!this.current(generation, abort)) return;
      if (evidence.some(entry => !isCurrentVisualizationResponse(entry.request.identity, entry.resolution, abort.signal))) {
        this.value.set({ state: 'error', message: 'The preview response no longer matches this request. Retry the current preview.' }); return;
      }
      const unsupportedChart = evidence.find(entry => entry.chartSupport.state === 'unsupported');
      if (unsupportedChart) {
        this.value.set({ state: 'incompatible', message: unsupportedChart.resolution.state === 'ready' ? 'These chart settings are not supported.' : unsupportedChart.resolution.message }); return;
      }
      const unavailable = evidence.find(entry => entry.resolution.state !== 'ready');
      if (unavailable && unavailable.resolution.state !== 'ready') {
        const resolution = unavailable.resolution;
        this.value.set({ state: resolution.state === 'waiting' ? 'loading' : resolution.state === 'invalid-analysis' ? 'error' : resolution.state,
          message: resolution.message }); return;
      }
      const compatibility = checkVisualizationCompatibility(definition, evidence);
      if (compatibility.state !== 'compatible') {
        this.value.set({ state: 'incompatible', message: 'Review the sources and settings before previewing this configuration.',
          reasons: compatibility.reasons.map(reason => reason.message) }); return;
      }
      const presenter = this.registry.presenter(definition.chart!.kind)!;
      const presentation = await presenter.prepare(definition, evidence, abort.signal);
      if (!this.current(generation, abort)) return;
      if (!presentation.details?.caption?.trim() || !presentation.details.columns.length
        || presentation.details.rows.some(row => row.length !== presentation.details.columns.length)) {
        this.value.set({ state: 'error', message: 'The preview does not provide complete accessible underlying values.' }); return;
      }
      this.value.set({ state: 'ready', message: 'Preview uses the current local configuration.', component: presenter.component,
        presentation, definition, evidence });
    } catch (error) {
      if (!this.current(generation, abort)) return;
      abort.abort();
      this.value.set({ state: 'error', message: error instanceof Error ? error.message : 'The preview could not be prepared. Retry to try again.' });
    }
  }
}

function civilDate(value: string | undefined): boolean {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
