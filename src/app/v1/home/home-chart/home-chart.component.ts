import { HomeEditor } from '../home-editor.service';
import { resolveVisualizationFacilities } from '@domain/visualizations/visualization-facilities';
import { utilityOwner } from '@domain/visualizations/utility/utility-selection';
import { accountAnalysisRoute } from '@app/v1/routing/workspace-route';
import { HomeDateContext } from '../home-date-context.service';
import { HomeLibrarySave } from '../home-library-save.service';
import { VisualizationNavigationService } from '@app/v1/visualizations/visualization-navigation.service';
import { HomeBrowseSession } from '../home-browse-session.service';
import { homeChartDisplay, applyHomeChartDisplay } from '@domain/home/home-chart-display';
import { PreviewRegistry } from '@app/v1/visualizations/preview/preview-registry';
import { visualizationSourceQuantities } from '@domain/visualizations/visualization-display-settings';
import { HomePrintState } from '../home-print-state.service';
import { HomeChartPrintCache } from '../home-chart-print-cache.service';
import { Component, computed, inject, input, viewChild, effect } from '@angular/core';
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
  private readonly dates = inject(HomeDateContext);
  readonly dateResolver = computed(() => { const widget = this.view().widget; return (widget.kind === 'visualization' || widget.kind === 'built-in-chart') && widget.inherit.includes('period') && !widget.overrides.period ? this.dates : undefined; });
  readonly library = inject(HomeLibrarySave);
  readonly editor = inject(HomeEditor);
  readonly navigation = inject(VisualizationNavigationService);
  readonly preview = viewChild(PreviewComponent);
  readonly browse = inject(HomeBrowseSession);
  readonly printing = inject(HomePrintState);
  private readonly printCache = inject(HomeChartPrintCache);
  private readonly registry = inject(PreviewRegistry);
  readonly values = computed(() => { const state = this.preview()?.preview.state(), model = this.model();
    return state?.state === 'ready' ? state.presentation.details : this.printing.active() && model?.state === 'configured' ? this.printCache.get(model) : undefined;
  });
  constructor() { effect(() => { const model = this.model(), state = this.preview()?.preview.state();
    if (model?.state === 'configured' && state?.state === 'ready' && state.evidence.length > 0 && state.evidence.every(entry => entry.request.identity.workspaceRevision === model.identity.workspaceRevision && entry.request.identity.definitionGuid === model.identity.definitionGuid && entry.request.identity.accountGuid === model.identity.accountGuid) && JSON.stringify(this.preview()?.definition) === JSON.stringify(model.definition)) this.printCache.set(model, state.presentation.details);
  }); }
  readonly reportingRoute = computed(() => { const widget = this.view().widget; return widget.kind === 'built-in-chart' ? widget.reference.owner.kind === 'account' ? accountAnalysisRoute(widget.reference.owner.guid) : ['/v1', 'workspace', 'facility', widget.reference.owner.guid, 'analysis', 'dashboard'] : undefined; });
  openSaved(guid: string): void {
    const owner = this.home.owner(), selected = this.home.selected(), account = this.home.workspace.account();
    if (owner && selected && account) void this.navigation.openFromHome({ accountGuid: account.guid, owner, reference: selected.reference, widgetId: this.view().widget.id, chartGuid: guid });
  }
  readonly model = computed(() => {
    const widget = this.view().widget, snapshot = this.home.workspace.snapshot();
    if (!snapshot || !this.home.workspace.isReady()) return undefined;
    if (this.view().state !== 'ready' && this.view().state !== 'deferred') return { state: 'unavailable' as const, message: this.view().message };
    const record = widget.kind === 'visualization' ? snapshot.savedVisualizations.find(item => item.guid === widget.visualizationGuid && item.accountId === snapshot.account.guid) : undefined;
    const read = record && readSavedVisualization(record);
    const builtIn = widget.kind === 'built-in-chart' ? buildHomeChart(widget.reference, snapshot.account.guid) : undefined;
    const baseDefinition = builtIn?.state === 'ready' ? builtIn.definition : read && 'definition' in read ? read.definition : undefined;
    if (!baseDefinition) return { state: 'unavailable' as const, message: builtIn?.state === 'unsupported' ? builtIn.message : 'This saved visualization is unavailable. Replace or remove its link.' };
    if (widget.kind !== 'visualization' && widget.kind !== 'built-in-chart') return undefined;
    const quantities = new Set(baseDefinition.sources.flatMap(source => visualizationSourceQuantities(baseDefinition, source, snapshot)));
    const dashboard = this.printing.active() ? this.home.definition()?.defaults ?? {} : this.browse.effective();
    const display = homeChartDisplay(widget, dashboard, quantities);
    const inheritedUnits = widget.inherit.includes('units') ? Object.keys(dashboard.displaySettings?.units ?? {}) : [];
    if (Object.keys(widget.overrides.displaySettings?.units ?? {}).some(key => !quantities.has(key))
      || inheritedUnits.length > 0 && !inheritedUnits.some(key => quantities.has(key)) && !Object.keys(widget.overrides.displaySettings?.units ?? {}).length)
      return { state: 'unavailable' as const, message: 'The requested units do not apply to this chart. Review controls or explicitly use base settings.' };
    const applied = applyHomeChartDisplay(baseDefinition, display, baseDefinition.sources.flatMap(source => { const provider = this.registry.provider(source.kind); return provider ? [provider.describe(source)] : []; }));
    if (applied.state !== 'ready') return applied;
    const definition = applied.definition;
    const reporting = resolveReportingVisualization(definition, snapshot);
    const selectedOwner = utilityOwner(snapshot, resolveVisualizationFacilities(definition, snapshot.facilities).scope);
    const treatment = definition.displaySettings?.energyTreatment;
    const energyBasis = treatment?.kind === 'pinned' ? treatment.value : selectedOwner?.energyIsSource ? 'source' : 'site';
    const analysisBasis = reporting.state === 'ready' ? reporting.definition.sources.flatMap(source => {
      if (source.kind !== 'analysis') return [];
      const analysis = [...snapshot.facilityAnalyses, ...snapshot.accountAnalyses].find(item => item.guid === source.analysisGuid);
      return analysis?.analysisCategory === 'energy' ? [`${analysis.energyIsSource ? 'Source' : 'Site'} basis · saved analysis`] : [];
    }) : [];
    const selection = definition.facilitySelection;
    const scope = selection.kind === 'all' ? 'All facilities (live)' : selection.facilityGuids.map(guid => snapshot.facilities.find(item => item.guid === guid)?.name ?? 'Unavailable facility').join(', ');
    const exactNames = definition.sources.flatMap(source => source.kind === 'analysis' && source.analysisGuid
      ? [`Named analysis · ${[...snapshot.facilityAnalyses, ...snapshot.accountAnalyses].find(item => item.guid === source.analysisGuid)?.name ?? 'Unavailable analysis'}`] : []);
    const identity = { accountGuid: snapshot.account.guid, workspaceRevision: this.home.workspace.revision(),
      definitionGuid: JSON.stringify(['home', this.home.owner(), this.home.selectedGuid(), widget.id,
        widget.kind === 'visualization' ? ['saved', widget.visualizationGuid] : widget.kind === 'built-in-chart' ? widget.reference : null, definition]),
      definitionRevision: record?.revision ?? 1 };
    return { state: 'configured' as const, definition, identity,
      context: [scope, ...exactNames, ...new Set(analysisBasis), ...(reporting.state === 'ready' ? reporting.context : [reporting.message]),
        widget.kind === 'visualization' ? 'Linked saved visualization · committed shared edits apply here' : 'Built-in configuration · no library record',
        definition.period.kind === 'all-history' ? 'All available history' : definition.period.kind === 'fixed' ? `${definition.period.start} through ${definition.period.end}` : `Period: ${definition.period.kind}`,
        ...definition.sources.flatMap(source => source.kind === 'utility' && source.measure.endsWith('emissions') ? [`${source.measure === 'market-emissions' ? 'Market' : 'Location'} emissions`] : []),
        definition.sources.some(source => source.kind === 'utility' && source.measure === 'energy') ? `${energyBasis === 'source' ? 'Source' : 'Site'} energy basis` : ''].filter(Boolean).join(' · ') };
  }, { equal: (a, b) => JSON.stringify(a) === JSON.stringify(b) });
}
