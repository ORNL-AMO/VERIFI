import { predictorCombinationSupported, isMixedPredictorSourceSet } from '@domain/visualizations/visualization-monthly-combination';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { resolveVisualizationFacilities } from '@domain/visualizations/visualization-facilities';
import { inject, Injectable, signal, Type } from '@angular/core';
import { checkVisualizationCompatibility } from '@domain/visualizations/visualization-capabilities';
import { VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { decodeVisualizationDefinition } from '@domain/visualizations/visualization-validation';
import { isCurrentVisualizationResponse, VisualizationSourceEvidence, VisualizationSourceRequest } from '@domain/visualizations/visualization-source-provider';
import { visualizationChartLabel } from '../visualization-charts';
import { PreviewIdentity, PreviewPresentation, PreviewRegistry } from './preview-registry';

export type PreviewState =
  | { readonly state: 'inactive' | 'setup-required' | 'invalid' | 'unsupported' | 'loading' | 'empty' | 'missing-source' | 'error' | 'incompatible'; readonly message: string; readonly reasons?: readonly string[] }
  | { readonly state: 'ready'; readonly component: Type<unknown>; readonly presentation: PreviewPresentation;
      readonly definition: VisualizationDefinition; readonly evidence: readonly VisualizationSourceEvidence[] };

let nextPreviewId = 0;

function emptyPreviewReasons(evidence: readonly VisualizationSourceEvidence[]): readonly string[] {
  const reasons = new Set<string>();
  for (const { resolution } of evidence) {
    if (resolution.state !== 'ready' && resolution.state !== 'empty') continue;
    if (resolution.state === 'empty') for (const reason of resolution.reasons ?? [resolution.message]) reasons.add(reason);
    const resolved = resolution.resolved;
    if (!resolved) continue;
    for (const warning of resolved.quality.warnings) reasons.add(warning);
    for (const omission of resolved.quality.omissions ?? []) reasons.add(`${omission.label} · ${omission.issue}: ${omission.readings.join('; ')}`);
    if (resolved.data.kind !== 'time-series') continue;
    const labels = new Map(resolved.series.map(series => [series.id, series.label]));
    for (const row of resolved.data.rows) for (const [id, observation] of Object.entries(row.values)) {
      if (observation.state === 'missing' || observation.state === 'excluded') reasons.add(`${labels.get(id) ?? id}: ${observation.reason}`);
    }
  }
  return [...reasons];
}

/** Preview lifetime and evidence are independent of persistence and autosave acknowledgements. */
@Injectable()
export class PreviewController {
  private readonly instanceId = ++nextPreviewId;
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly registry = inject(PreviewRegistry);
  private readonly value = signal<PreviewState>({ state: 'inactive', message: 'Chart is inactive.' });
  readonly state = this.value.asReadonly();
  private generation = 0;
  private abort?: AbortController;
  private context?: { definition?: VisualizationDefinition; identity?: PreviewIdentity; active: boolean };
  private destroyed = false;

  update(definition: VisualizationDefinition | undefined, identity: PreviewIdentity | undefined, active = true): void {
    this.cancel();
    if (this.destroyed) return;
    this.context = { definition: definition ? structuredClone(definition) : undefined, identity: identity ? { ...identity } : undefined, active };
    if (!active) { this.value.set({ state: 'inactive', message: 'Chart is inactive.' }); return; }
    if (!definition || !identity) { this.value.set({ state: 'setup-required', message: 'Open a saved visualization.' }); return; }
    const decoded = decodeVisualizationDefinition(this.context.definition);
    if (decoded.state !== 'valid') {
      this.value.set({ state: decoded.state === 'unsupported' ? 'unsupported' : decoded.state === 'invalid' ? 'invalid' : 'setup-required',
        message: decoded.state === 'setup-required'
          ? decoded.definition.chart
            ? `Complete source selection and the remaining settings for this ${visualizationChartLabel(decoded.definition.chart)} visualization.`
            : 'Complete source and chart setup.'
          : 'This saved configuration cannot be displayed.',
        reasons: decoded.issues.map(issue => issue.message) });
      return;
    }
    if (identity.accountGuid !== decoded.definition.accountGuid || !identity.definitionGuid.trim()) {
      this.value.set({ state: 'invalid', message: 'The chart does not belong to the current account and visualization.' }); return;
    }
    const providers = decoded.definition.sources.map(source => this.registry.provider(source.kind));
    const presenter = this.registry.presenter(decoded.definition.chart!.kind);
    if (providers.some(provider => !provider) || !presenter || !this.registry.dates) {
      this.value.set({ state: 'unsupported', message: 'These data sources or chart settings are not supported yet. Your saved setup is preserved.' }); return;
    }
    if (!predictorCombinationSupported(decoded.definition)) {
      this.value.set({ state: 'unsupported', message: 'Use monthly calendarized meters and predictors without comparison. Your saved setup is preserved.' }); return;
    }
    if (decoded.definition.sources.length > 1 && decoded.definition.sources.some((source, index) => providers[index]!.describe(source).allowMultipleSources === false)) {
      this.value.set({ state: 'unsupported', message: 'A selected source does not support combinations. Your saved setup is preserved.' }); return;
    }
    const unsupported = decoded.definition.sources.flatMap((source, index) => {
      const support = providers[index]!.supportsChart(source, decoded.definition.chart!);
      return support.state === 'unsupported' ? support.reasons : [];
    });
    if (unsupported.length) { this.value.set({ state: 'incompatible', message: unsupported.join(' ') }); return; }
    const abort = this.abort = new AbortController();
    const generation = this.generation;
    this.value.set({ state: 'loading', message: 'Preparing chart…' });
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
      const analysisSnapshot = definition.sources.some(source => source.kind === 'analysis') ? this.workspace.snapshot() : undefined;
      const { scope, missingFacilityGuids } = resolveVisualizationFacilities(definition, this.workspace.facilities());
      if (missingFacilityGuids.length) {
        this.value.set({ state: 'missing-source', message: 'Review the missing selected facilities.', reasons: missingFacilityGuids }); return;
      }
      if (!scope.facilityGuids.length) { this.value.set({ state: 'empty', message: 'No included facilities are available.' }); return; }
      const dateContext = Object.freeze({ ...await this.registry.dates!.resolve(definition, identity, abort.signal) });
      if (!this.current(generation, abort)) return;
      if (definition.sources.some(source => source.kind === 'predictor') && definition.period.kind === 'rolling'
        && definition.period.anchor === 'latest-data' && !dateContext.latestDataDate && dateContext.emptyReasons) {
        this.value.set({ state: 'empty', message: 'No eligible saved value is available for the latest-data range.', reasons: dateContext.emptyReasons }); return;
      }
      if (!civilDate(dateContext.calendarDate) || dateContext.latestDataDate !== undefined && !civilDate(dateContext.latestDataDate)
        || definition.period.kind === 'rolling' && definition.period.anchor === 'latest-data' && !dateContext.latestDataDate && !definition.sources.some(source => source.kind === 'predictor' || source.kind === 'analysis')) {
        this.value.set({ state: 'incompatible', message: 'The selected period has no valid calendar date or latest-data anchor.' }); return;
      }
      const requestId = `visualization-preview-${this.instanceId}-${generation}`;
      const evidence = await Promise.all(definition.sources.map(async source => {
        const provider = this.registry.provider(source.kind)!;
        const chartSupport = provider.supportsChart(source, definition.chart!);
        const capabilities = provider.describe(source);
        const request: VisualizationSourceRequest = { identity: { ...identity, requestId, scope, sourceId: source.id },
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
        this.value.set({ state: 'error', message: 'The chart response is out of date. Retry the chart.' }); return;
      }
      const unsupportedChart = evidence.find(entry => entry.chartSupport.state === 'unsupported');
      if (unsupportedChart) {
        this.value.set({ state: 'incompatible', message: unsupportedChart.resolution.state === 'ready' ? 'These chart settings are not supported.' : unsupportedChart.resolution.message }); return;
      }
      if (definition.sources.some(source => source.kind === 'predictor') && evidence.every(entry => entry.resolution.state === 'ready' || entry.resolution.state === 'empty') && !evidence.some(entry => {
        const result = entry.resolution;
        return (result.state === 'ready' || result.state === 'empty') && result.resolved?.data.kind === 'time-series'
          && result.resolved.data.rows.some(row => Object.values(row.values).some(value => value.state === 'observed'));
      })) {
        this.value.set({ state: 'empty', message: 'No usable values in the selected month range.', reasons: emptyPreviewReasons(evidence) }); return;
      }
      const unavailable = evidence.find(entry => entry.resolution.state === 'missing-source' || entry.resolution.state === 'error') ?? evidence.find(entry => entry.resolution.state !== 'ready' && !(isMixedPredictorSourceSet(definition.sources) && entry.resolution.state === 'empty' && entry.resolution.resolved));
      if (unavailable && unavailable.resolution.state !== 'ready') {
        const resolution = unavailable.resolution;
        this.value.set({ state: resolution.state === 'waiting' ? 'loading' : resolution.state === 'invalid-analysis' ? 'error' : resolution.state,
          message: resolution.message, ...('reasons' in resolution ? { reasons: resolution.reasons } : {}) }); return;
      }
      const compatibility = checkVisualizationCompatibility(definition, evidence);
      if (compatibility.state !== 'compatible') {
        this.value.set({ state: 'incompatible', message: 'Review the data sources and chart settings.',
          reasons: compatibility.reasons.map(reason => reason.message) }); return;
      }
      const presenter = this.registry.presenter(definition.chart!.kind)!;
      const presentation = await presenter.prepare(definition, evidence, abort.signal);
      if (!this.current(generation, abort)) return;
      if (analysisSnapshot && (!this.workspace.isReady() || this.workspace.snapshot() !== analysisSnapshot)) {
        abort.abort(); this.value.set({ state: 'error', message: 'Analysis inputs changed while preparing the chart. Retry current results.' }); return;
      }
      if (!presentation.details?.caption?.trim() || !presentation.details.columns.length
        || presentation.details.rows.some(row => row.length !== presentation.details.columns.length)) {
        this.value.set({ state: 'error', message: 'The chart does not provide complete accessible values.' }); return;
      }
      this.value.set({ state: 'ready', component: presenter.component,
        presentation, definition, evidence });
    } catch (error) {
      if (!this.current(generation, abort)) return;
      abort.abort();
      this.value.set({ state: 'error', message: error instanceof Error ? error.message : 'The chart could not be prepared. Retry the chart.' });
    }
  }
}

function civilDate(value: string | undefined): boolean {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
