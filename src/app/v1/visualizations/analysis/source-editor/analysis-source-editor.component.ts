import { visualizationInterval } from '@domain/visualizations/visualization-interval';
import { Component, DestroyRef, Input, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
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
    const analysis = this.workspace.facilityAnalyses().find(item => item.guid === source.analysisGuid);
    const group = analysis?.groups.find(item => item.idbGroupId === source.groupGuid);
    return (Object.entries(analysisMeasureLabels) as [AnalysisResultVisualizationSource['measure'], string][])
      .filter(([measure]) => visualizationInterval(definition?.chart) === 'yearly'
        ? ['actual', 'calculated', 'annual-improvement', 'total-improvement'].includes(measure)
        : !['annual-improvement', 'total-improvement'].includes(measure) && (!measure.startsWith('banked-') || !!analysis?.hasBanking && !!group?.applyBanking))
      .map(([value, label]) => ({ value, label }));
  });
  readonly missingMeasure = computed(() => { const source = this.source(); return source?.mode === 'result' && !this.measures().some(item => item.value === source.measure); });
  readonly issue = computed(() => {
    const source = this.source(), definition = this.view()?.definition;
    if (!source || !definition?.chart) return 'Complete source and chart setup.';
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
    this.view.set(context); this.hydrate(); context.disabled ? this.form.disable({ emitEvent: false }) : this.form.enable({ emitEvent: false });
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
  selectAnalysis(guid: string): void { const source = this.source(); if (source?.mode !== 'result' || guid !== source.analysisGuid) this.binding(guid); }
  defaults(): void { const view = this.view(); if (view && !view.disabled) view.request?.({ kind: 'analysis-defaults', sourceId: view.sourceId }); }
  private hydrate(): void {
    const source = this.source(), chart = this.view()?.definition.chart;
    this.form.reset({ groupGuid: source?.groupGuid ?? '', measure: source?.mode === 'result' ? source.measure : 'actual',
      interval: visualizationInterval(chart) === 'yearly' ? 'yearly' : 'monthly' }, { emitEvent: false });
  }
}
