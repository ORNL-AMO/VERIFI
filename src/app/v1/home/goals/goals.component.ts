import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { HomeWidget, HomeAnalysisBinding } from '@domain/home/home-dashboard';
import { homeGoalContext, homeGoalResult } from '@domain/home/home-goals';
import { AnalysisDataSession } from '@app/v1/visualizations/analysis/analysis-data-session.service';
import { VisualizationSourceRequest } from '@domain/visualizations/visualization-source-provider';
import { accountAnalysisRoute, accountAnalysisWorkbenchRoute, facilityAnalysisWorkbenchRoute, accountSettingsRoute, facilitySettingsRoute } from '@app/v1/routing/workspace-route';
import { HomeContext } from '../home-context.service';

type Result = ReturnType<typeof homeGoalResult> | { state: 'loading' | 'error'; message: string };
@Component({ selector: 'app-home-goals', standalone: false, templateUrl: './goals.component.html', styleUrl: './goals.component.css' })
export class HomeGoalsComponent {
  readonly widget = input.required<HomeWidget>();
  readonly active = input(true);
  readonly home = inject(HomeContext);
  private readonly data = inject(AnalysisDataSession);
  readonly results = signal<Readonly<Record<string, Result>>>({});
  readonly retry = signal(0);
  readonly increment = (value: number) => value + 1;
  readonly contexts = computed(() => {
    const snapshot = this.home.workspace.snapshot(), owner = this.home.owner(), widget = this.widget();
    if (!snapshot || !owner) return [];
    const bindings: HomeAnalysisBinding[] = widget.kind === 'goal' ? [widget.binding]
      : widget.kind === 'table' && widget.settings.view === 'facility-progress' && owner.kind === 'account'
        ? snapshot.facilities.filter(f => f.accountId === snapshot.account.guid).flatMap(f =>
          (widget.settings.categories ?? (widget.settings.measure === 'energy' || widget.settings.measure === 'water' ? [widget.settings.measure] : []))
            .map(category => ({ kind: 'reporting' as const, owner: { kind: 'facility' as const, guid: f.guid }, category }))) : [];
    return bindings.map(binding => {
      const context = homeGoalContext(binding, snapshot), scoped = context.owner;
      return { ...context, bindingKind: binding.kind, key: JSON.stringify(binding), settingsRoute: scoped?.kind === 'facility' ? facilitySettingsRoute(scoped.guid) : accountSettingsRoute(snapshot.account.guid),
        analysisRoute: binding.kind === 'exact' && context.analysis && scoped ? scoped.kind === 'facility' ? facilityAnalysisWorkbenchRoute(scoped.guid, context.analysis.guid) : accountAnalysisWorkbenchRoute(snapshot.account.guid, context.analysis.guid) : accountAnalysisRoute(snapshot.account.guid), query: scoped?.kind === 'facility' && !snapshot.account.isSingleFacilityCompany ? { facility: scoped.guid } : {} };
    });
  });
  private previousSnapshot?: object;
  private previousIntent = '';
  constructor() {
    effect(cleanup => {
      const contexts = this.contexts(), snapshot = this.home.workspace.snapshot(), revision = this.home.workspace.revision();
      const active = this.active();
      const intent = JSON.stringify([this.widget(), this.home.owner(), this.home.selectedGuid(), this.retry()]);
      const abort = new AbortController(); cleanup(() => abort.abort());
      if (snapshot !== this.previousSnapshot || intent !== this.previousIntent) this.results.set({});
      this.previousSnapshot = snapshot; this.previousIntent = intent;
      if (!active || !snapshot || !this.home.workspace.isReady()) return;
      for (const context of contexts) {
        if (context.message || !context.analysis || !context.owner) continue;
        const owner = context.owner, analysis = context.analysis;
        const source = { id: 'goal', kind: 'analysis' as const, mode: 'result' as const, analysisGuid: analysis.guid, measure: 'rolling-improvement' as const, aggregation: 'none' as const };
        const request: VisualizationSourceRequest = { identity: { accountGuid: snapshot.account.guid, workspaceRevision: revision,
          definitionGuid: JSON.stringify(['home-goal', this.home.selectedGuid(), this.widget(), context.key]), definitionRevision: 1,
          sourceId: source.id, requestId: context.key, scope: owner.kind === 'facility' ? { kind: 'facility', facilityGuid: owner.guid, facilityGuids: [owner.guid] }
            : { kind: 'portfolio', facilityGuids: snapshot.facilities.filter(f => f.accountId === snapshot.account.guid).map(f => f.guid) } },
          source, chart: { kind: 'time-series', interval: 'monthly', defaultTraceType: 'line', stack: 'none' },
          period: { kind: 'all-history' }, comparison: { kind: 'none' }, series: [], dateContext: { calendarDate: new Date().toISOString().slice(0, 10) } };
        this.results.update(values => ({ ...values, [context.key]: { state: 'loading', message: 'Calculating current reporting results…' } }));
        void this.data.acquire(request, abort.signal).then(result => {
          if (abort.signal.aborted || snapshot !== this.home.workspace.snapshot()) return;
          this.results.update(values => ({ ...values, [context.key]: result.state === 'ready'
            ? homeGoalResult(result.value, context.goal.state === 'ready' ? context.goal.target : undefined)
            : { state: 'error', message: result.message } }));
        }).catch(error => { if (!abort.signal.aborted) this.results.update(values => ({ ...values, [context.key]: { state: 'error', message: error instanceof Error ? error.message : 'Calculation failed.' } })); });
      }
    });
  }
}
