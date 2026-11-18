import { unchangedCaptureSource } from '@data/visualizations/visualization-capture-origin';
import { facilityMeterRoute } from '@app/v1/routing/workspace-route';
import { PreviewComponent } from '../preview/preview/preview.component';
import { isCompositionChart } from '@domain/visualizations/visualization-composition';
import { resolveUtilitySelection } from '@domain/visualizations/utility/utility-selection';
import { isExplorationChart } from '@domain/visualizations/visualization-interval';
import type { VisualizationChart } from '@domain/visualizations/visualization-definition';
import { timeSeriesStackIssues, timeSeriesStackSettingsIssues } from '@domain/visualizations/visualization-time-series';
import { discoverUtilitySeries } from '@domain/visualizations/utility/utility-catalog';
import { discoverEquipmentSeries } from '@domain/visualizations/energy-use/equipment-source';
import { resolveVisualizationSeries } from '@domain/visualizations/visualization-series';
import { projectDecisionItems, configuredChartSummary } from '../shared/configured-items';
import { projectTraceItems, utilityMeasureLabels } from '../shared/trace-items';
import { resolvePredictorSelection } from '@domain/visualizations/predictor/predictor-source';
import { TemplatePortal } from '@angular/cdk/portal';
import { Component, DestroyRef, ElementRef, TemplateRef, ViewChild, ViewContainerRef, computed, effect, inject, signal, untracked, viewChild, afterRenderEffect } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { FormControl } from '@angular/forms';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { VisualizationEditorSession } from '../editing/visualization-editor-session.service';
import { VisualizationNavigationService } from '../visualization-navigation.service';
import { createVisualizationChart, VISUALIZATION_CHART_CHOICES, VisualizationChartChoiceId, visualizationChartLabel } from '../visualization-charts';
import { VISUALIZATION_DATA_SOURCES } from '../visualization-data-sources';
import { inspectVisualizationReferences } from '@data/account-workspace/visualization-reference-inspection';
import { RecoveryActionsComponent, VisualizationChildDraftGuard } from '../recovery/recovery-actions/recovery-actions.component';
import { VisualizationFacilitySelection, VisualizationSourceKind } from '@domain/visualizations/visualization-definition';
import { resolveVisualizationFacilities } from '@domain/visualizations/visualization-facilities';
import { orderFacilities } from '@app/v1/shared/facilities/facility-order';
import { decisionNodeId, prepareDecisionChange } from '../decisions/decision-tree';
import type { DecisionChangeResult, DecisionRef, VisualizationDecisionAction } from '../decisions/decision-types';
import type { PeriodSettingsContext, VisualizationSourceEditorContext } from '../shared/source-editor-context';
import { visualizationIntentEqual } from '../editing/visualization-reconciliation';
import type { PageBreadcrumb } from '@app/v1/shared/page-identity/page-identity.component';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import type { StatusEvaluationState, StatusItem } from '@app/v1/status/status.models';
import { predictorStatusPresentation as dataStatusPresentation } from '@app/v1/data/predictors/inventory/predictor-inventory.models';

@Component({ selector: 'app-visualization-workbench', standalone: false, host: { class: 'visualization-workbench-host' },
  templateUrl: './workbench.component.html', styleUrls: ['./workbench.component.css'], providers: [VisualizationEditorSession] })
export class WorkbenchComponent {
  readonly editor = inject(VisualizationEditorSession);
  readonly smoothLines = new FormControl(false, { nonNullable: true });
  readonly dataSources = computed(() => {
    const definition = this.editor.definition(), kinds = new Set(definition?.sources.map(source => source.kind));
    const composition = isCompositionChart(definition?.chart);
    return VISUALIZATION_DATA_SOURCES.map(choice => ({ ...choice, selected: kinds.has(choice.value),
      disabled: definition?.chart?.kind === 'monthly-patterns' && !kinds.has(choice.value) && !['utility', 'predictor'].includes(choice.value) || composition && !kinds.has(choice.value) && (definition?.chart?.kind === 'sankey' ? choice.value !== 'energy-use' : !['utility', 'energy-use'].includes(choice.value)) || !this.editor.canEdit() || !!this.pendingDecision() || this.decisionBusy() || kinds.size === 1 && kinds.has(choice.value) }));
  });
  get charts() { return VISUALIZATION_CHART_CHOICES; }
  readonly expandedNodes = signal<ReadonlySet<string>>(new Set());
  readonly nodeResetKeys = signal<Readonly<Record<string, number>>>({});
  readonly decisionError = signal('');
  readonly decisionBusy = signal(false);
  private readonly childRevision = signal(0);
  readonly pendingDecision = signal<{ action: VisualizationDecisionAction; result: Exclude<DecisionChangeResult, { state: 'unchanged' }>; key: string; revision: number; childRevision: number; workspaceRevision: number } | undefined>(undefined);
  readonly facilityChoicesDisabled = computed(() => !this.editor.canRetarget() || !!this.pendingDecision()
    || this.editor.state() === 'error' || this.editor.state() === 'refresh-required' || !!this.editor.conflicts().length);
  readonly pendingFacilitiesLabel = computed(() => {
    const action = this.pendingDecision()?.action;
    return action?.kind === 'facilities' ? this.selectionLabel(action.selection) : '';
  });
  private decisionPortal?: TemplatePortal;
  @ViewChild('decisionDialog', { static: true }) private decisionDialog!: TemplateRef<unknown>;
  @ViewChild('settingsPanel', { read: ElementRef }) private panelElement?: ElementRef<HTMLElement>;
  readonly rootNodes = { facilities: decisionNodeId({ kind: 'facilities' }), chart: decisionNodeId({ kind: 'chart' }), sources: decisionNodeId({ kind: 'sources' }), period: decisionNodeId({ kind: 'period' }), appearance: decisionNodeId({ kind: 'appearance' }) };
  readonly facilities = computed(() => orderFacilities(this.workspace.facilities().filter(item => item.accountId === this.accountGuid()), this.workspace.account()?.portfolioFacilityOrder));
  readonly facilityContext = computed(() => { const definition = this.editor.definition(); return definition ? resolveVisualizationFacilities(definition, this.facilities()) : undefined; });
  readonly facilitiesUnavailable = computed(() => !this.facilityContext()?.scope.facilityGuids.length || !!this.facilityContext()?.missingFacilityGuids.length);
  readonly facilitySummary = computed(() => { const selection = this.editor.definition()?.facilitySelection; return selection ? this.selectionLabel(selection) : 'Choose facilities'; });
  readonly settingsExpanded = new FormControl(true, { nonNullable: true });
  readonly workspace = inject(AccountWorkspaceStore);
  readonly navigation = inject(WorkspaceNavigationService);
  private readonly status = inject(WorkspaceStatusService);
  private readonly selectedStatusResources = computed(() => {
    const definition = this.editor.definition(), snapshot = this.workspace.snapshot();
    const empty = { meters: [] as readonly string[], predictors: [] as readonly string[] };
    if (!this.workspace.isReady() || !snapshot || definition?.accountGuid !== this.accountGuid()
      || snapshot.account.guid !== this.accountGuid() || this.editor.record()?.guid !== this.navigation.routeState().visualizationGuid) return empty;
    const scope = this.facilityContext()?.scope;
    if (!scope) return empty;
    const meters = new Set(definition.sources.flatMap(source => source.kind === 'utility'
      ? resolveUtilitySelection(snapshot, scope, source).meters.map(meter => meter.guid) : []));
    const predictors = new Set(definition.sources.flatMap(source => source.kind === 'predictor'
      ? resolvePredictorSelection(snapshot, scope, source) : []));
    return { meters: [...meters], predictors: snapshot.predictors.filter(predictor => predictor.accountId === snapshot.account.guid
      && scope.facilityGuids.includes(predictor.facilityId) && predictors.has(predictor.guid)).map(predictor => predictor.guid) };
  });
  readonly selectedMeterGuids = computed(() => this.selectedStatusResources().meters);
  readonly selectedPredictorGuids = computed(() => this.selectedStatusResources().predictors);
  readonly hasDataStatusSources = computed(() => !!(this.selectedMeterGuids().length || this.selectedPredictorGuids().length));
  readonly dataStatusState = computed<StatusEvaluationState>(() => {
    const state = this.status.state(), evaluation = this.status.evaluation();
    return state === 'ready' && (evaluation?.accountGuid !== this.accountGuid() || evaluation.revision !== this.workspace.revision()) ? 'evaluating' : state;
  });
  readonly dataStatusIssues = computed(() => {
    if (this.dataStatusState() !== 'ready') return [];
    const meters = new Set(this.selectedMeterGuids()), predictors = new Set(this.selectedPredictorGuids());
    return this.status.items().filter(item => item.entity.accountGuid === this.accountGuid()
      && (item.entity.kind === 'meter' && meters.has(item.entity.guid) || item.entity.kind === 'predictor' && predictors.has(item.entity.guid))
      && (item.severity === 'error' || item.severity === 'warning'));
  });
  readonly dataHeaderStatus = computed(() => {
    const issues = this.dataStatusIssues();
    return dataStatusPresentation(issues.some(issue => issue.severity === 'error') ? 'danger' : issues.length ? 'warning' : 'success', this.dataStatusState());
  });
  readonly dataStatusSummaries = computed(() => this.dataStatusIssues().slice(0, 2));
  readonly remainingDataIssues = computed(() => this.dataStatusIssues().slice(2));

  openDataIssue(item: StatusItem): void {
    // Recheck a rendered action against the current account, selection, and active findings.
    const current = this.dataStatusIssues().find(issue => issue.id === item.id);
    if (current) this.status.navigateTo(current);
  }
  readonly journeys = inject(VisualizationNavigationService);
  private readonly unsaved = inject(UnsavedChangesService);
  private readonly modal = inject(ModalPortalService);
  private readonly container = inject(ViewContainerRef);
  private readonly destroy = inject(DestroyRef);
  private portal?: TemplatePortal;
  private leaveResolve?: (accepted: boolean) => void;
  private leaving?: Promise<boolean>;
  private leaveKey = '';
  private leaveRevision = 0;
  private readonly invalidEditors = signal<Readonly<Record<string, boolean>>>({});
  private readonly editorReset = signal(0);
  readonly hasInvalidFields = computed(() => Object.values(this.invalidEditors()).some(Boolean));
  readonly periodInvalid = computed(() => !!this.invalidEditors()[this.rootNodes.period]);
  readonly editorKey = computed(() => `${this.editor.key()}:${this.editorReset()}`);
  readonly recoveryChildDrafts: VisualizationChildDraftGuard = { invalid: this.hasInvalidFields, key: this.editorKey, discard: () => this.discardFields() };
  @ViewChild('leaveDialog', { static: true }) private leaveDialog!: TemplateRef<unknown>;
  @ViewChild(RecoveryActionsComponent) private recoveryActions?: RecoveryActionsComponent;
  readonly accountGuid = computed(() => this.navigation.routeState().accountGuid ?? '');
  readonly sourceLink = computed(() => {
    if (this.editor.isMissing() || this.hasInvalidFields() || this.editor.form.invalid || this.editor.conflicts().length || !this.workspace.isReady()) return undefined;
    const source = unchangedCaptureSource(this.editor.record(), this.editor.definition(), this.workspace.snapshot());
    return source ? { route: facilityMeterRoute(source.facilityGuid, source.meterGuid, 'monthly-chart'), fragment: source.kind === 'meter-monthly' ? 'meter-monthly-chart' : 'meter-fiscal-comparison-heading' } : undefined;
  });
  private readonly previewChild = viewChild(PreviewComponent);
  readonly patternYears = computed(() => this.previewChild()?.monthlyPatternsModel()?.years ?? []);
  readonly patternLoading = signal(false);
  readonly breadcrumbs = computed<readonly PageBreadcrumb[]>(() => {
    const route = this.journeys.dashboardRoute(this.accountGuid());
    if (this.navigation.isSingleSiteWorkspace()) return [{ label: 'Dashboard', icon: 'dataVisualization', route }];
    const scope = this.facilityContext()?.scope;
    const facilityGuid = scope?.kind === 'facility' ? scope.facilityGuid : undefined;
    const facility = this.workspace.facilities().find(item => item.guid === facilityGuid);
    return [
      { label: this.workspace.account()?.name || 'Account', route },
      ...(facilityGuid ? [{ label: facility?.name || 'Unavailable facility',
        ...(facility ? { route, queryParams: { facility: facility.guid } } : {}) }] : [])
    ];
  });
  readonly scopeLabel = computed(() => {
    const scope = this.facilityContext()?.scope;
    return scope?.kind === 'facility' ? this.facilities().find(item => item.guid === scope.facilityGuid)?.name ?? 'Unavailable facility' : this.workspace.account()?.name || 'Account';
  });
  readonly sourcePanels = computed(() => {
    const definition = this.editor.definition(), key = this.editor.key(), revision = this.editor.localRevision();
    if (!definition) return [];
    return definition.sources.filter((source, index, sources) => sources.findIndex(item => item.kind === source.kind) === index).map(source => {
      const choice = VISUALIZATION_DATA_SOURCES.find(item => item.value === source.kind)!;
      const nodeId = decisionNodeId({ kind: 'source', sourceId: source.id });
      const context: VisualizationSourceEditorContext = { definition, sourceId: source.id, editorKey: this.editorKey(),
        disabled: !this.editor.canEdit(), expandedNodes: this.expandedNodes(), nodeResetKeys: this.nodeResetKeys(),
        request: action => {
          if (this.editor.key() !== key) return;
          if (this.editor.localRevision() !== revision) {
            const current = this.editor.definition(), snapshot = this.workspace.snapshot();
            if (!current || !snapshot) return;
            // Continuous form edits can arrive before the next render. Apply typed patches
            // to current intent, while rejecting removed items and superseded measure forms.
            if (action.kind === 'item-style') {
              if (!projectDecisionItems(current, action.sourceId, snapshot).some(item => action.item.resourceGuid !== undefined
                ? item.identity.resourceGuid === action.item.resourceGuid : item.identity.seriesId === action.item.seriesId)) return;
            } else if (action.kind === 'equipment-unit') {
              if (source.kind !== 'energy-use' || current.sources.find(item => item.id === source.id)?.kind !== 'energy-use') return;
            } else if (action.kind === 'source-settings') {
              const currentSource = current.sources.find(item => item.id === action.sourceId);
              if (source.kind !== 'utility' || currentSource?.kind !== 'utility' || currentSource.measure !== source.measure) return;
            } else if (action.kind === 'source-measures' || action.kind === 'analysis-targets') {
              if (action.kind === 'source-measures' && source.kind !== action.sourceKind || action.kind === 'analysis-targets' && source.kind !== 'analysis') return;
            } else return;
          }
          void this.requestDecision(action);
        },
        sectionChanged: (id, expanded) => this.setSection(id, expanded),
        nodeValidityChanged: (id, invalid) => this.setEditorValidity(key, id, invalid),
        draftChanged: () => this.childRevision.update(value => value + 1),
        changed: next => { if (this.editor.key() === key && this.editor.localRevision() === revision) this.editor.applyDefinition(next); } };
      return { id: source.id, kind: source.kind, label: choice.label, icon: choice.icon, nodeId,
        summary: source.kind === 'utility' ? definition.sources.filter(item => item.kind === source.kind).map(item => utilityMeasureLabels[item.measure] ?? item.measure).join(', ')
          : source.kind === 'predictor' ? '' : source.measure,
        context, attention: this.invalidEditors()[nodeId] || Object.entries(this.invalidEditors()).some(([id, invalid]) => invalid && id.split(':')[1] === encodeURIComponent(source.id)) };
    });
  });
  readonly traceItems = computed(() => {
    const definition = this.editor.definition(), snapshot = this.workspace.snapshot();
    return definition && snapshot ? projectTraceItems(definition, snapshot).map(item => ({ ...item,
      resetKey: this.nodeResetKeys()[decisionNodeId({ kind: 'item', sourceId: item.sourceId, itemKey: item.key })] ?? 0 })) : [];
  });
  readonly sourceCategoryCount = computed(() => new Set(this.editor.definition()?.sources.map(source => source.kind)).size);
  readonly displayContext = computed(() => {
    const key = this.editor.key();
    return { definition: this.editor.definition()!, disabled: !this.editor.canEdit(), editorKey: this.editorKey(), request: (action: VisualizationDecisionAction) => { if (this.editor.key() === key) this.requestTrace(action); } };
  });
  requestTrace(action: VisualizationDecisionAction): void { void this.requestDecision(action); }
  readonly chartSummary = computed(() => {
    const definition = this.editor.definition(), snapshot = this.workspace.snapshot();
    return definition && snapshot ? configuredChartSummary(definition, snapshot) ?? visualizationChartLabel(definition.chart) : 'Chart not selected';
  });
  readonly chartTypeSummary = computed(() => this.chartSummary().split(' · ')[0]);
  readonly stackChoices = computed(() => {
    const definition = this.editor.definition(), snapshot = this.workspace.snapshot();
    if (!definition || !snapshot || definition.chart?.kind !== 'time-series') return [];
    const currentChart = definition.chart;
    const scope = resolveVisualizationFacilities(definition, snapshot.facilities).scope;
    const metadata = definition.sources.flatMap(source => source.kind === 'utility' ? discoverUtilitySeries(snapshot, scope, source)
      : source.kind === 'energy-use' ? discoverEquipmentSeries(snapshot, scope, source) : []);
    const items = definition.sources.flatMap(source => projectDecisionItems(definition, source.id, snapshot));
    return (['none', 'absolute', 'percent'] as const).map(stack => {
      const chart = { ...currentChart, stack };
      const candidate = { ...definition, chart };
      const reasons = [...new Set([...timeSeriesStackSettingsIssues(chart, definition.sources, items.map(item => item.appearance)),
        ...timeSeriesStackIssues(candidate, resolveVisualizationSeries(candidate, metadata), []).map(issue => issue.message)])];
      return { value: stack, label: stack === 'none' ? 'None' : stack === 'absolute' ? 'Absolute' : 'Percentage', reason: reasons.join(' ') };
    });
  });
  readonly annualEquipment = computed(() => this.editor.definition()?.sources.some(source => source.kind === 'energy-use') ?? false);
  readonly calendarizedOnly = computed(() => !this.editor.definition()?.sources.some(source => source.kind === 'utility' && source.dataMode === 'billing-period'));
  readonly previewIdentity = computed(() => ({ accountGuid: this.accountGuid(), workspaceRevision: this.workspace.revision(),
    definitionGuid: this.navigation.routeState().visualizationGuid ?? '', definitionRevision: this.editor.localRevision() }));
  readonly previewActive = computed(() => {
    const definition = this.editor.definition(), snapshot = this.workspace.snapshot();
    return !!definition && !!snapshot && this.workspace.isReady() && snapshot.account.guid === this.accountGuid()
      && this.editor.record()?.guid === this.navigation.routeState().visualizationGuid
      && !this.editor.isMissing() && this.editor.state() !== 'readonly' && !this.editor.record()?.preservation?.locked
      && !inspectVisualizationReferences(definition, snapshot, this.editor.record()?.preservation?.references).length;
  });
  readonly periodContext = computed(() => this.editContext(this.rootNodes.period));
  readonly periodSummary = computed(() => {
    const period = this.editor.definition()?.period;
    if (!period) return 'Unavailable';
    if (period.kind === 'all-history') return 'All saved history';
    if (period.kind === 'fixed') return this.editor.definition()?.sources.some(source => source.kind === 'predictor')
      ? `${period.start.slice(0, 7)} – ${period.end.slice(0, 7)} (${period.basis})` : `${period.start} – ${period.end} (${period.basis})`;
    if (period.kind === 'rolling') return `Rolling ${period.count} ${period.unit}(s), ${period.anchor} anchor (${period.basis})`;
    return period.kind === 'fiscal-year' ? `Fiscal year ${period.year}` : 'Latest saved fiscal year';
  });
  readonly saveInProgress = computed(() => this.editor.saving() || this.editor.state() === 'dirty');
  readonly saveLabel = computed(() => this.hasInvalidFields() ? 'Correct unsaved field input' : this.saveInProgress() ? 'Saving…' : ({ saved: 'Saved.', dirty: 'Saving…', saving: 'Saving…', invalid: 'Fix validation errors.',
    error: 'Save failed', conflict: 'Review conflicting changes', 'refresh-required': 'Saved; workspace refresh required',
    missing: 'Visualization unavailable', readonly: 'Read-only saved visualization' })[this.editor.state()]);
  readonly saveNeedsAttention = computed(() => this.hasInvalidFields() || ['invalid', 'error', 'conflict', 'refresh-required', 'missing'].includes(this.editor.state()));

  constructor() {
    afterRenderEffect(() => this.patternLoading.set(this.previewChild()?.preview.state().state === 'loading'));
    effect(() => {
      const chart = this.editor.definition()?.chart, enabled = this.editor.canEdit();
      this.smoothLines.setValue((chart?.kind === 'time-series' || chart?.kind === 'monthly-patterns') && chart.smoothLines === true, { emitEvent: false });
      if (enabled) this.smoothLines.enable({ emitEvent: false }); else this.smoothLines.disable({ emitEvent: false });
    });
    const smoothing = this.smoothLines.valueChanges.subscribe(value => {
      const definition = this.editor.definition();
      if (this.editor.canEdit() && (definition?.chart?.kind === 'time-series' || definition?.chart?.kind === 'monthly-patterns') && !!definition.chart.smoothLines !== value)
        this.editor.applyDefinition({ ...definition, chart: { ...definition.chart, smoothLines: value } });
    });
    this.destroy.onDestroy(() => smoothing.unsubscribe());
    effect(() => {
      const route = this.navigation.routeState();
      if (route.section === 'visualization' && route.visualizationGuid && route.accountGuid) {
        untracked(() => this.editor.open(route.accountGuid!, route.visualizationGuid!));
      }
    });
    const unregister = this.unsaved.registerNavigationPreflight(() => this.resolveLeave());
    const unregisterFields = this.unsaved.register(() => this.hasInvalidFields(), () => this.discardFields(), () => this.editor.saving());
    const unloadFields = this.unsaved.protectBeforeUnload(this.hasInvalidFields);
    let priorKey = '';
    effect(() => { const key = this.editor.key(); if (key !== priorKey) { priorKey = key; untracked(() => { this.invalidEditors.set({}); this.settingsExpanded.setValue(true, { emitEvent: false }); this.nodeResetKeys.set({}); this.expandedNodes.set(new Set()); this.cancelDecision(); }); } });
    this.destroy.onDestroy(() => { unregister(); unregisterFields(); unloadFields(); this.finishLeave(false); this.cancelDecision(); });
  }

  private editContext(id: string): PeriodSettingsContext {
    const definition = this.editor.definition()!, key = this.editor.key(), editorKey = this.editorKey(), resetKey = this.nodeResetKeys()[id] ?? 0;
    let expectedPeriod = definition.period, expectedComparison = definition.comparison;
    const currentContext = () => this.editor.key() === key && this.editorKey() === editorKey && (this.nodeResetKeys()[id] ?? 0) === resetKey;
    return { definition, editorKey, resetKey, draftChanged: () => this.childRevision.update(value => value + 1), disabled: !this.editor.canEdit(),
      validityChanged: invalid => { if (currentContext()) this.setEditorValidity(key, id, invalid); },
      changed: change => {
        const current = this.editor.definition();
        if (!currentContext() || !current || !this.editor.canEdit()
          || !visualizationIntentEqual(current.facilitySelection, definition.facilitySelection)
          || !visualizationIntentEqual(current.period, expectedPeriod) || !visualizationIntentEqual(current.comparison, expectedComparison)) return;
        const next = { ...current, period: change.period, comparison: change.comparison };
        if (!visualizationIntentEqual(next, current)) this.editor.applyDefinition(next);
        expectedPeriod = this.editor.definition()!.period; expectedComparison = this.editor.definition()!.comparison;
      } };
  }
  private setEditorValidity(key: string, id: string, invalid: boolean): void {
    if (key !== this.editor.key() || !!this.invalidEditors()[id] === invalid) return;
    this.invalidEditors.update(state => ({ ...state, [id]: invalid }));
  }
  private discardFields(): void { this.invalidEditors.set({}); this.editorReset.update(value => value + 1); }
  toggleSettings(toggle: HTMLButtonElement): void {
    const panel = this.panelElement?.nativeElement;
    if (this.settingsExpanded.value && panel?.contains(panel.ownerDocument.activeElement)) toggle.focus();
    this.settingsExpanded.setValue(!this.settingsExpanded.value);
  }

  toggleDataSource(kind: VisualizationSourceKind): void {
    const choice = this.dataSources().find(option => option.value === kind);
    if (!choice || choice.disabled) return;
    void this.requestDecision({ kind: choice.selected ? 'remove-source-kind' : 'add-source', sourceKind: kind });
  }

  setSection(id: string, expanded: boolean): void {
    this.expandedNodes.update(current => { const next = new Set(current); expanded ? next.add(id) : next.delete(id); return next; });
  }
  chooseFacilities(selection: VisualizationFacilitySelection): void { void this.requestDecision({ kind: 'facilities', selection }); }
  private selectionLabel(selection: VisualizationFacilitySelection): string {
    return selection.kind === 'all' ? 'All Facilities' : selection.facilityGuids.length === 1
      ? this.facilities().find(item => item.guid === selection.facilityGuids[0])?.name || 'Unavailable facility' : `${selection.facilityGuids.length} facilities`;
  }
  readonly explorationItems = computed(() => {
    const definition = this.editor.definition(), snapshot = this.workspace.snapshot();
    return definition && snapshot ? definition.sources.flatMap(source => projectDecisionItems(definition, source.id, snapshot)) : [];
  });
  setPatternVisibility(hiddenYears: readonly number[]): void {
    const definition = this.editor.definition(); if (!this.editor.canEdit() || definition?.chart?.kind !== 'monthly-patterns') return;
    const overrides = { ...definition.chart.yearOverrides };
    for (const year of this.patternYears()) overrides[String(year.year)] = { ...overrides[String(year.year)], visible: !hiddenYears.includes(year.year) };
    this.updateChartSettings({ ...definition.chart, yearOverrides: overrides });
  }
  updateChartSettings(chart: VisualizationChart): void { void this.requestDecision({ kind: 'chart', chart }); }
  chooseChart(choice: VisualizationChartChoiceId): void {
    const current = this.editor.definition()?.chart;
    if (isCompositionChart(current) && (current.kind === choice || current.kind === 'breakdown' && (current.type === 'bar' ? choice === 'breakdown-bar' : choice === 'donut'))) return;
    if ((choice === 'line' || choice === 'bar' || choice === 'area') && this.editor.definition()?.chart?.kind === 'time-series') void this.requestDecision({ kind: 'chart-type', traceType: choice });
    else {
      let chart = createVisualizationChart(choice);
      const sources = this.editor.definition()?.sources;
      if (isExplorationChart(chart) && sources?.length === 1 && sources[0].kind === 'energy-use') chart = { ...chart, interval: 'yearly', ...(chart.kind === 'heatmap' ? { dimension: 'series-period' as const } : {}) };
      void this.requestDecision({ kind: 'chart', chart });
    }
  }
  setStack(stack: 'none' | 'absolute' | 'percent'): void {
    if (this.stackChoices().find(choice => choice.value === stack)?.reason) return;
    void this.requestDecision({ kind: 'chart-stack', stack });
  }
  setInterval(interval: 'monthly' | 'yearly'): void {
    const definition = this.editor.definition();
    if (!definition || !this.editor.canEdit() || definition.chart?.kind !== 'time-series' || definition.chart.interval === interval) return;
    this.editor.applyDefinition({ ...definition, chart: { ...definition.chart, interval } });
  }
  async requestDecision(action: VisualizationDecisionAction): Promise<void> {
    const snapshot = this.workspace.snapshot(); let definition = this.editor.definition();
    if (!snapshot || !definition || !(action.kind === 'facilities' ? this.editor.canRetarget() : this.editor.canEdit()) || this.pendingDecision() || this.decisionBusy()) return;
    this.decisionError.set('');
    let result = prepareDecisionChange(definition, action, { snapshot, preservedReferences: this.editor.record()?.preservation?.references,
      invalidNodeIds: Object.keys(this.invalidEditors()).filter(id => this.invalidEditors()[id]) });
    if (result.state === 'unchanged') return;
    if (action.kind === 'facilities') {
      if (this.editor.form.invalid) { this.decisionError.set('Correct the visualization name before changing facilities.'); return; }
      this.decisionBusy.set(true);
      try {
        if (!await this.editor.flush()) { this.decisionError.set('Resolve the current save or conflicting changes before changing facilities.'); return; }
      } finally { this.decisionBusy.set(false); }
      definition = this.editor.definition();
      const currentSnapshot = this.workspace.snapshot(); if (!definition || !currentSnapshot) return;
      result = prepareDecisionChange(definition, action, { snapshot: currentSnapshot, preservedReferences: this.editor.record()?.preservation?.references,
        invalidNodeIds: Object.keys(this.invalidEditors()).filter(id => this.invalidEditors()[id]) });
      if (result.state === 'unchanged') return;
    }
    if (result.state === 'confirm' && action.kind !== 'facilities' && this.editor.form.valid && (this.editor.state() === 'dirty' || this.editor.saving())) {
      this.decisionBusy.set(true);
      try {
        if (!await this.editor.flush()) { this.decisionError.set('Resolve the current save before reviewing this change.'); return; }
      } finally { this.decisionBusy.set(false); }
      const current = this.editor.definition(), currentSnapshot = this.workspace.snapshot();
      if (!current || !currentSnapshot) return;
      result = prepareDecisionChange(current, action, { snapshot: currentSnapshot, preservedReferences: this.editor.record()?.preservation?.references,
        invalidNodeIds: Object.keys(this.invalidEditors()).filter(id => this.invalidEditors()[id]) });
      if (result.state === 'unchanged') return;
    }
    if (result.state === 'confirm') {
      this.pendingDecision.set({ action, result, key: this.editor.key(), revision: this.editor.localRevision(), childRevision: this.childRevision(), workspaceRevision: this.workspace.revision() });
      this.decisionPortal = new TemplatePortal(this.decisionDialog, this.container); this.modal.show(this.decisionPortal, { blockWorkspace: true });
    } else await this.applyDecision(action, result);
  }
  async confirmDecision(): Promise<void> {
    const pending = this.pendingDecision();
    if (!pending || this.editor.saving() || this.decisionBusy()) return;
    if (pending.key !== this.editor.key() || pending.revision !== this.editor.localRevision() || pending.childRevision !== this.childRevision() || pending.workspaceRevision !== this.workspace.revision()) {
      this.cancelDecision(); this.decisionError.set('Settings changed during review. Choose the decision again to review its current effects.'); return;
    }
    const { action, result } = pending;
    this.cancelDecision(); await this.applyDecision(action, result);
    const key = this.editor.key();
    const target = result.next ? decisionNodeId(result.next) : this.rootNodes.sources;
    setTimeout(() => { if (!this.destroy.destroyed && key === this.editor.key()) this.panelElement?.nativeElement.ownerDocument.getElementById(`${target}-heading`)?.focus(); });
  }
  cancelDecision(): void {
    if (this.decisionPortal && this.modal.activePortal() === this.decisionPortal) this.modal.hide();
    this.decisionPortal = undefined; this.pendingDecision.set(undefined);
  }
  private async applyDecision(action: VisualizationDecisionAction, result: Exclude<DecisionChangeResult, { state: 'unchanged' }>): Promise<void> {
    const active = this.panelElement?.nativeElement.ownerDocument.activeElement;
    const focusWasInside = !!active && this.panelElement?.nativeElement.contains(active);
    if (action.kind === 'facilities') {
      this.decisionBusy.set(true);
      try { if (!await this.editor.retarget(action.selection, result.definition)) return; }
      finally { this.decisionBusy.set(false); }
    } else this.editor.applyDefinition(result.definition);
    if (action.kind === 'item-order') {
      const key = this.editor.key();
      const target = decisionNodeId({ kind: 'item', sourceId: action.sourceId, itemKey: action.item.resourceGuid !== undefined ? `resource:${action.item.resourceGuid}` : `series:${action.item.seriesId}` });
      setTimeout(() => { if (!this.destroy.destroyed && key === this.editor.key()) this.panelElement?.nativeElement.ownerDocument.getElementById(`${target}-heading`)?.focus(); });
    }
    this.resetAffected(result.affectedNodeIds);
    if (result.next) this.openDecisionPath(result.next);
    if (focusWasInside && active instanceof HTMLElement && (!active.isConnected || active.getClientRects().length === 0)) {
      const target = result.next ? decisionNodeId(result.next) : this.rootNodes.sources;
      queueMicrotask(() => this.panelElement?.nativeElement.ownerDocument.getElementById(`${target}-heading`)?.focus());
    }
  }
  private nodeAffected(id: string, affected: readonly string[]): boolean {
    if (affected.includes(id)) return true;
    const parts = id.split(':');
    return !!parts[1] && affected.includes(`source:${parts[1]}`);
  }
  private resetAffected(affected: readonly string[]): void {
    const invalid = this.invalidEditors(), resets = { ...this.nodeResetKeys() };
    for (const id of new Set([...Object.keys(invalid), ...affected])) if (this.nodeAffected(id, affected)) resets[id] = (resets[id] ?? 0) + 1;
    this.invalidEditors.set(Object.fromEntries(Object.entries(invalid).filter(([id]) => !this.nodeAffected(id, affected))));
    this.nodeResetKeys.set(resets);
  }
  private openDecisionPath(ref: DecisionRef): void {
    const ids = [decisionNodeId(ref)];
    if (ref.sourceId) ids.push(decisionNodeId({ kind: 'source', sourceId: ref.sourceId }));
    this.expandedNodes.update(current => new Set([...current, ...ids]));
  }
  back(): void { void this.journeys.returnToDashboard(this.accountGuid()); }

  resolveLeave(): Promise<boolean> {
    if (this.leaving) return this.leaving;
    this.leaving = this.prepareLeave().finally(() => this.leaving = undefined);
    return this.leaving;
  }

  private async prepareLeave(): Promise<boolean> {
    if (this.pendingDecision() || this.decisionBusy() || this.recoveryActions?.blocksNavigation()) return false;
    if (!this.editor.needsProtection() && !this.hasInvalidFields()) return true;
    const flushed = !this.hasInvalidFields() && await this.editor.flush();
    if (this.pendingDecision() || this.decisionBusy() || this.recoveryActions?.blocksNavigation()) return false;
    if (flushed && !this.hasInvalidFields()) return true;
    if (!this.editor.needsProtection() && !this.hasInvalidFields()) return true;
    this.leaveKey = this.editor.key(); this.leaveRevision = this.editor.localRevision();
    this.portal = new TemplatePortal(this.leaveDialog, this.container);
    this.modal.show(this.portal, { blockWorkspace: true });
    return new Promise<boolean>(resolve => this.leaveResolve = resolve);
  }

  discardLeave(): void {
    if (this.editor.saving() || this.editor.state() === 'refresh-required' || this.leaveKey !== this.editor.key()
      || this.leaveRevision !== this.editor.localRevision()) { this.finishLeave(false); return; }
    this.editor.discard(); this.discardFields(); this.finishLeave(!this.editor.needsProtection());
  }

  async retryLeave(): Promise<void> {
    if (!this.hasInvalidFields() && await this.editor.retry()) this.finishLeave(true);
    else { this.leaveKey = this.editor.key(); this.leaveRevision = this.editor.localRevision(); }
  }

  finishLeave(accepted = false): void {
    if (this.portal && this.modal.activePortal() === this.portal) this.modal.hide();
    this.portal = undefined;
    const resolve = this.leaveResolve; this.leaveResolve = undefined; resolve?.(accepted);
  }
}

export const visualizationLeaveGuard: CanDeactivateFn<WorkbenchComponent> = () => inject(UnsavedChangesService).resolveNavigationPreflight();
