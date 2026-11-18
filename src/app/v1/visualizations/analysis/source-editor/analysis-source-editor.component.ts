import { visualizationAnalysisBasisIssue } from '@domain/visualizations/visualization-display-settings';
import { visualizationInterval } from '@domain/visualizations/visualization-interval';
import { Component, DestroyRef, Input, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, FormRecord } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { resolveVisualizationFacilities } from '@domain/visualizations/visualization-facilities';
import { accountAnalysisInclusionIssue, analysisMeasureLabels, analysisPeriodIssue, facilityAnalysisChartSupport } from '@domain/visualizations/analysis/facility-analysis-source';
import type { AnalysisResultVisualizationSource } from '@domain/visualizations/visualization-definition';
import type { VisualizationSourceEditorContext } from '../../shared/source-editor-context';
import { decisionNodeId } from '../../decisions/decision-tree';
import { analysisGroupChoices, analysisChoices, projectAnalysisItems } from '../analysis-items';

@Component({ selector: 'app-analysis-source-editor', standalone: false, templateUrl: './analysis-source-editor.component.html',
  styleUrls: ['../../shared/compact-controls.css', './analysis-source-editor.component.css'] })
export class AnalysisSourceEditorComponent {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly destroy = inject(DestroyRef);
  readonly view = signal<VisualizationSourceEditorContext | undefined>(undefined);
  readonly form = new FormGroup({ groupGuid: new FormControl('', { nonNullable: true }),
    measure: new FormControl<AnalysisResultVisualizationSource['measure']>('actual', { nonNullable: true }), interval: new FormControl<'monthly' | 'yearly'>('monthly', { nonNullable: true }) });
  readonly selectedAnalyses = new FormControl<string[]>([], { nonNullable: true });
  readonly targetScopes = new FormRecord<FormControl<string[]>>({});
  readonly targets = computed(() => {
    const view = this.view();
    return [...new Map((view?.definition.sources ?? []).filter((item): item is AnalysisResultVisualizationSource => item.kind === 'analysis' && item.mode === 'result' && !!item.analysisGuid)
      .map(item => [item.analysisGuid, item])).values()].map(source => ({ guid: source.analysisGuid!, groupGuid: source.groupGuid,
        label: this.choices().find(choice => choice.value === source.analysisGuid)?.label ?? 'Unavailable analysis',
        groups: this.workspace.snapshot() ? analysisGroupChoices(this.workspace.snapshot()!, source.analysisGuid).map(group => ({ guid: group.value, label: group.label })) : [],
        scopes: [...new Set((view?.definition.sources ?? []).flatMap(item => item.kind === 'analysis' && item.analysisGuid === source.analysisGuid ? [item.groupGuid ?? 'total'] : []))],
        account: this.workspace.accountAnalyses().some(item => item.guid === source.analysisGuid) }));
  });
  readonly resourceOptions = computed(() => this.choices().map(choice => ({ guid: choice.value, label: choice.label })));
  readonly selectedMeasures = computed(() => this.view()?.definition.sources.filter(source => source.kind === 'analysis').map(source => source.measure) ?? []);
  readonly measureChoices = computed(() => this.measures().map(measure => ({ ...measure, selected: this.selectedMeasures().includes(measure.value) })));
  readonly emptyNodes: ReadonlySet<string> = new Set();
  readonly source = computed(() => { const view = this.view(); const source = view?.definition.sources.find(item => item.id === view.sourceId); return source?.kind === 'analysis' ? source : undefined; });
  readonly scope = computed(() => { const snapshot = this.workspace.snapshot(), view = this.view(); return snapshot && view ? resolveVisualizationFacilities(view.definition, snapshot.facilities).scope : undefined; });
  readonly choices = computed(() => { const snapshot = this.workspace.snapshot(), view = this.view(), scope = this.scope(); return snapshot && view && scope ? analysisChoices(snapshot, scope, view.definition.facilitySelection.kind === 'all') : []; });
  readonly pickerId = computed(() => `visualization-analysis-${encodeURIComponent(this.view()?.sourceId ?? '')}`);
  readonly pickerKey = computed(() => JSON.stringify([this.view()?.editorKey, this.view()?.resetKey, this.view()?.sourceId, this.view()?.definition.facilitySelection]));
  readonly accountAnalysis = computed(() => this.workspace.accountAnalyses().find(item => item.guid === this.source()?.analysisGuid && item.accountId === this.workspace.account()?.guid));
  readonly isAccount = computed(() => !!this.accountAnalysis());
  readonly groups = computed(() => { const snapshot = this.workspace.snapshot(); return snapshot ? analysisGroupChoices(snapshot, this.source()?.analysisGuid) : []; });
  readonly missingAnalysis = computed(() => !!this.source()?.analysisGuid && !this.isAccount() && !this.choices().some(item => item.value === this.source()?.analysisGuid));
  readonly missingGroup = computed(() => !!this.source()?.groupGuid && !this.groups().some(item => item.value === this.source()?.groupGuid));
  readonly measures = computed(() => {
    const source = this.source(), definition = this.view()?.definition;
    if (!source || source.mode !== 'result') return [];
    const targets = this.targets();
    const banking = targets.length > 0 && targets.every(target => {
      const analysis = this.workspace.facilityAnalyses().find(item => item.guid === target.guid);
      return analysis?.hasBanking && target.scopes.every(scope => scope !== 'total' && analysis.groups.some(group => group.idbGroupId === scope && group.applyBanking));
    });
    return (Object.entries(analysisMeasureLabels) as [AnalysisResultVisualizationSource['measure'], string][])
      .filter(([measure]) => visualizationInterval(definition?.chart) === 'yearly'
        ? ['actual', 'calculated', 'annual-improvement', 'total-improvement'].includes(measure)
        : !['annual-improvement', 'total-improvement'].includes(measure) && (!measure.startsWith('banked-') || banking))
      .map(([value, label]) => ({ value, label }));
  });
  readonly missingMeasure = computed(() => { const source = this.source(); return source?.mode === 'result' && !this.measures().some(item => item.value === source.measure); });
  readonly issue = computed(() => {
    const source = this.source(), definition = this.view()?.definition;
    if (!source || !definition?.chart) return 'Complete source and chart setup.';
    const snapshot = this.workspace.snapshot(), basisIssue = snapshot && visualizationAnalysisBasisIssue(definition, snapshot);
    if (basisIssue) return basisIssue;
    const accountAnalysis = this.accountAnalysis();
    if (accountAnalysis) {
      if (source.groupGuid || source.mode === 'result' && source.measure.startsWith('banked-')) return 'Account totals do not support group targets or separate banked measures.';
      const snapshot = this.workspace.snapshot();
      const inclusion = snapshot && accountAnalysisInclusionIssue((accountAnalysis.facilityAnalysisItems ?? []).filter(link => link.analysisItemId && link.analysisItemId !== 'skip').map(link => link.facilityId), resolveVisualizationFacilities(definition, snapshot.facilities).scope.facilityGuids);
      if (inclusion) return inclusion;
    }
    const support = facilityAnalysisChartSupport(source, definition.chart);
    return support.state === 'unsupported' ? support.reasons.join(' ') : analysisPeriodIssue({ chart: definition.chart, period: definition.period, comparison: definition.comparison });
  });
  readonly items = computed(() => {
    const snapshot = this.workspace.snapshot(), view = this.view();
    return snapshot && view ? projectAnalysisItems(view.definition, view.sourceId, snapshot).map(item => ({ ...item,
      resetKey: view.nodeResetKeys?.[decisionNodeId({ kind: 'item', sourceId: view.sourceId, itemKey: item.key })] ?? 0 })) : [];
  });
  @Input({ required: true }) set context(context: VisualizationSourceEditorContext) {
    this.view.set(context); this.hydrate();
    this.selectedAnalyses.setValue(this.targets().map(target => target.guid), { emitEvent: false });
    for (const target of this.targets()) {
      if (!Object.hasOwn(this.targetScopes.controls, target.guid)) {
        const control = new FormControl<string[]>([], { nonNullable: true }); this.targetScopes.addControl(target.guid, control, { emitEvent: false });
        control.valueChanges.pipe(takeUntilDestroyed(this.destroy)).subscribe(scopes => this.setTargetScopes(target.guid, scopes));
      }
      this.targetScopes.controls[target.guid].setValue(target.scopes, { emitEvent: false });
    }
    context.disabled ? this.targetScopes.disable({ emitEvent: false }) : this.targetScopes.enable({ emitEvent: false }); context.disabled ? this.form.disable({ emitEvent: false }) : this.form.enable({ emitEvent: false });
  }
  constructor() {
    this.form.controls.groupGuid.valueChanges.pipe(takeUntilDestroyed(this.destroy)).subscribe(groupGuid => this.binding(this.source()?.analysisGuid ?? '', groupGuid));
    this.form.controls.measure.valueChanges.pipe(takeUntilDestroyed(this.destroy)).subscribe(measure => {
      const view = this.view(); this.hydrate(); if (view && !view.disabled) view.request?.({ kind: 'analysis-measure', sourceId: view.sourceId, measure });
    });
    this.form.controls.interval.valueChanges.pipe(takeUntilDestroyed(this.destroy)).subscribe(interval => {
      const view = this.view(); this.hydrate(); if (view && !view.disabled) view.request?.({ kind: 'analysis-interval', sourceId: view.sourceId, interval });
    });
  }
  private binding(analysisGuid: string, groupGuid?: string): void {
    const view = this.view(); this.hydrate();
    if (view && !view.disabled) view.request?.({ kind: 'analysis-binding', sourceId: view.sourceId, ...(analysisGuid ? { analysisGuid } : {}), ...(groupGuid ? { groupGuid } : {}) });
  }
  selectAnalysis(guid: string): void { this.setAnalyses(this.selectedAnalyses.value.includes(guid) ? this.selectedAnalyses.value.filter(value => value !== guid) : [...this.selectedAnalyses.value, guid]); }
  setAnalyses(ids: readonly string[]): void {
    const view = this.view(); if (!view || view.disabled) return;
    view.request?.({ kind: 'analysis-targets', targets: ids.flatMap(analysisGuid => {
      const old = this.targets().find(target => target.guid === analysisGuid);
      return (old?.scopes ?? ['total']).map(scope => ({ analysisGuid, ...(scope !== 'total' ? { groupGuid: scope } : {}) }));
    }) });
  }
  setTargetScopes(analysisGuid: string, scopes: readonly string[]): void {
    const view = this.view(); if (!view || view.disabled || !scopes.length) return;
    view.request?.({ kind: 'analysis-targets', targets: this.targets().flatMap(target => (target.guid === analysisGuid ? scopes : target.scopes)
      .map(scope => ({ analysisGuid: target.guid, ...(scope !== 'total' ? { groupGuid: scope } : {}) }))) });
  }
  toggleTargetScope(analysisGuid: string, scope: string, selected: boolean): void {
    const scopes = this.targets().find(target => target.guid === analysisGuid)?.scopes ?? [];
    this.setTargetScopes(analysisGuid, selected ? [...scopes, scope] : scopes.filter(value => value !== scope));
  }
  toggleMeasure(measure: AnalysisResultVisualizationSource['measure']): void {
    const view = this.view(); if (!view || view.disabled) return;
    const selected = [...new Set(this.selectedMeasures())], measures = selected.includes(measure) ? selected.filter(value => value !== measure) : [...selected, measure];
    if (measures.length) view.request?.({ kind: 'source-measures', sourceKind: 'analysis', measures });
  }
  defaults(): void { const view = this.view(); if (view && !view.disabled) view.request?.({ kind: 'analysis-defaults', sourceId: view.sourceId }); }
  private hydrate(): void {
    const source = this.source(), chart = this.view()?.definition.chart;
    this.form.reset({ groupGuid: source?.groupGuid ?? '', measure: source?.mode === 'result' ? source.measure : 'actual',
      interval: visualizationInterval(chart) === 'yearly' ? 'yearly' : 'monthly' }, { emitEvent: false });
  }
}
