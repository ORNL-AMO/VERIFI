import { Component, computed, inject, input, viewChild } from '@angular/core';
import { HomeContext } from '../home-context.service';
import { HomeWidgetView } from '../home-widget-view';
import { buildHomeChart } from '@domain/home/home-chart-recipes';
import { readSavedVisualization } from '@data/visualizations/saved-visualization-record';
import { resolveReportingVisualization } from '@domain/visualizations/analysis/reporting-analysis';
import { PreviewComponent } from '@app/v1/visualizations/preview/preview/preview.component';

@Component({ selector: 'app-home-chart', standalone: false, templateUrl: './home-chart.component.html', styleUrl: './home-chart.component.css' })
export class HomeChartComponent {
  readonly view = input.required<HomeWidgetView>();
  readonly active = input(true);
  readonly home = inject(HomeContext);
  readonly preview = viewChild(PreviewComponent);
  readonly values = computed(() => { const state = this.preview()?.preview.state(); return state?.state === 'ready' ? state.presentation.details : undefined; });
  readonly model = computed(() => {
    const widget = this.view().widget, snapshot = this.home.workspace.snapshot();
    if (!snapshot || !this.home.workspace.isReady()) return undefined;
    if (this.view().state !== 'ready' && this.view().state !== 'deferred') return { state: 'unavailable' as const, message: this.view().message };
    if ((widget.kind === 'visualization' || widget.kind === 'built-in-chart') && (widget.inherit.length || Object.keys(widget.overrides).length))
      return { state: 'unavailable' as const, message: 'This widget retains dashboard display overrides. Review its controls before rendering; the base configuration has not replaced your choices.' };
    const record = widget.kind === 'visualization' ? snapshot.savedVisualizations.find(item => item.guid === widget.visualizationGuid && item.accountId === snapshot.account.guid) : undefined;
    const read = record && readSavedVisualization(record);
    const builtIn = widget.kind === 'built-in-chart' ? buildHomeChart(widget.reference, snapshot.account.guid) : undefined;
    const definition = builtIn?.state === 'ready' ? builtIn.definition : read && 'definition' in read ? read.definition : undefined;
    if (!definition) return { state: 'unavailable' as const, message: builtIn?.state === 'unsupported' ? builtIn.message : 'This saved visualization is unavailable. Replace or remove its link.' };
    const reporting = resolveReportingVisualization(definition, snapshot);
    const selection = definition.facilitySelection;
    const scope = selection.kind === 'all' ? 'All facilities (live)' : selection.facilityGuids.map(guid => snapshot.facilities.find(item => item.guid === guid)?.name ?? 'Unavailable facility').join(', ');
    const exactNames = definition.sources.flatMap(source => source.kind === 'analysis' && source.analysisGuid
      ? [`Named analysis · ${[...snapshot.facilityAnalyses, ...snapshot.accountAnalyses].find(item => item.guid === source.analysisGuid)?.name ?? 'Unavailable analysis'}`] : []);
    const identity = { accountGuid: snapshot.account.guid, workspaceRevision: this.home.workspace.revision(),
      definitionGuid: JSON.stringify(['home', this.home.owner(), this.home.selectedGuid(), widget.id,
        widget.kind === 'visualization' ? ['saved', widget.visualizationGuid] : widget.kind === 'built-in-chart' ? widget.reference : null]),
      definitionRevision: record?.revision ?? 1 };
    return { state: 'configured' as const, definition, identity,
      context: [scope, ...exactNames, ...(reporting.state === 'ready' ? reporting.context : [reporting.message]),
        widget.kind === 'visualization' ? 'Linked saved visualization · committed shared edits apply here' : 'Built-in configuration · no library record',
        definition.period.kind === 'all-history' ? 'All available history' : `Period: ${definition.period.kind}`].join(' · ') };
  });
}
