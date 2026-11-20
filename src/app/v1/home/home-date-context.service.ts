import { civilMonthIndex, civilMonthRange } from '@domain/visualizations/visualization-periods';
import { HomePrintState } from './home-print-state.service';
import { Injectable, inject } from '@angular/core';
import { HomeContext } from './home-context.service';
import { HomeBrowseSession } from './home-browse-session.service';
import { PreviewRegistry, PreviewDateContextResolver, PreviewIdentity, PreviewDateContext } from '@app/v1/visualizations/preview/preview-registry';
import { VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { buildHomeChart } from '@domain/home/home-chart-recipes';
import { homeChartDisplay, applyHomeChartDisplay } from '@domain/home/home-chart-display';
import { readSavedVisualization } from '@data/visualizations/saved-visualization-record';
import { resolveReportingVisualization } from '@domain/visualizations/analysis/reporting-analysis';
import { projectVisualizationDisplaySettings } from '@domain/visualizations/visualization-display-settings';

/** Inherited latest-data windows share eligible active histories; each chart keeps its own source scope. */
@Injectable()
export class HomeDateContext implements PreviewDateContextResolver {
  private readonly home = inject(HomeContext);
  private readonly printing = inject(HomePrintState);
  private readonly browse = inject(HomeBrowseSession);
  private readonly registry = inject(PreviewRegistry);
  private readonly pending = new Map<string, { abort: AbortController; consumers: Set<symbol>; promise: Promise<string | undefined> }>();
  async resolve(definition: VisualizationDefinition, identity: PreviewIdentity, signal: AbortSignal): Promise<PreviewDateContext> {
    const resolver = this.registry.dates;
    if (!resolver) throw new Error('Chart date resolution is unavailable.');
    const local = await resolver.resolve(definition, identity, signal);
    const dashboard = this.printing.active() ? this.home.definition()?.defaults ?? {} : this.browse.effective();
    const period = dashboard.period, snapshot = this.home.workspace.snapshot();
    if (signal.aborted || !snapshot || period?.kind !== 'rolling' || period.anchor !== 'latest-data'
      || JSON.stringify(definition.period) !== JSON.stringify(period)) return local;
    const participating = this.home.widgetShells().flatMap(view => {
      const widget = view.widget;
      if (view.state !== 'ready' || (widget.kind !== 'built-in-chart' && widget.kind !== 'visualization') || !widget.inherit.includes('period') || widget.overrides.period) return [];
      const record = widget.kind === 'visualization' ? snapshot.savedVisualizations.find(item => item.guid === widget.visualizationGuid) : undefined;
      const read = record && readSavedVisualization(record), built = widget.kind === 'built-in-chart' ? buildHomeChart(widget.reference, snapshot.account.guid) : undefined;
      const base = built?.state === 'ready' ? built.definition : read && 'definition' in read ? read.definition : undefined;
      if (!base) return [];
      const applied = applyHomeChartDisplay(base, homeChartDisplay(widget, dashboard), base.sources.flatMap(source => { const provider = this.registry.provider(source.kind); return provider ? [provider.describe(source)] : []; }));
      if (applied.state !== 'ready') return [];
      const reporting = resolveReportingVisualization(applied.definition, snapshot);
      return reporting.state === 'ready' ? [{ definition: projectVisualizationDisplaySettings(reporting.definition, snapshot), widgetId: widget.id }] : [];
    });
    const signature = JSON.stringify([identity.accountGuid, identity.workspaceRevision, this.home.owner(), this.home.selectedGuid(), participating]);
    let entry = this.pending.get(signature);
    if (!entry) {
      const abort = new AbortController(), consumers = new Set<symbol>();
      const promise = Promise.allSettled(participating.map(item => resolver.resolve(item.definition,
        { ...identity, definitionGuid: JSON.stringify(['home-date', this.home.owner(), this.home.selectedGuid(), item.widgetId]) }, abort.signal)))
        .then(results => results.flatMap(result => result.status === 'fulfilled' && result.value.latestDataDate ? [result.value.latestDataDate] : []).sort().at(-1))
        .finally(() => { if (this.pending.get(signature)?.promise === promise) this.pending.delete(signature); });
      entry = { abort, consumers, promise }; this.pending.set(signature, entry);
    }
    const token = Symbol(); entry.consumers.add(token);
    const release = () => { entry!.consumers.delete(token); if (!entry!.consumers.size) entry!.abort.abort(); };
    signal.addEventListener('abort', release, { once: true });
    try { const latestDataDate = await entry.promise;
      const last = latestDataDate ? civilMonthIndex(latestDataDate) : NaN, first = last - period.count * (period.unit === 'year' ? 12 : 1) + 1;
      const monthlyRange = first >= 12 && last <= 119999 ? { start: civilMonthRange(first).start, end: civilMonthRange(last).end } : undefined;
      return { ...local, latestDataDate, monthlyRange,
      ...(!latestDataDate ? { emptyReasons: ['No eligible saved observations are available for the shared dashboard window.'] } : {}) }; }
    finally { signal.removeEventListener('abort', release); release(); }
  }
}
