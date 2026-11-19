import { Injectable, computed, inject } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { HomeCommands } from '@data/account-workspace/home-commands.service';
import { readHomeDashboard, readHomeWidget } from '@data/home/home-record';
import { homeDashboardVisible, homeOwnerResolutionState } from '@data/home/home-references';
import { readSavedVisualization } from '@data/visualizations/saved-visualization-record';
import { HomeOwner, presentedHomeOwner } from '@domain/home/home-dashboard';
import { WorkspaceContextService } from '@app/v1/shell/workspace-context.service';
import { homeDashboardRoute, homeOwnerRoute } from '@app/v1/routing/workspace-route';

/** Read-only accepted route + committed workspace projection. Entry never initializes records. */
@Injectable({ providedIn: 'root' })
export class HomeContext {
  readonly workspace = inject(AccountWorkspaceStore);
  readonly context = inject(WorkspaceContextService);
  private readonly commands = inject(HomeCommands);
  readonly owner = computed<HomeOwner | undefined>(() => {
    const account = this.workspace.account(), route = this.context.routeState();
    if (!this.workspace.isReady() || !account || route.section !== 'home') return undefined;
    const presented = presentedHomeOwner(account, this.workspace.facilities());
    if (!presented) return undefined;
    if (route.contextMode === 'account') return route.accountGuid === account.guid ? presented : undefined;
    return this.workspace.facilities().some(item => item.guid === route.facilityGuid && item.accountId === account.guid)
      ? { kind: 'facility', guid: route.facilityGuid! } : undefined;
  });
  readonly ownerName = computed(() => {
    const owner = this.owner();
    return owner?.kind === 'facility' ? this.workspace.facilities().find(item => item.guid === owner.guid)?.name
      : owner ? this.workspace.account()?.name : undefined;
  });
  readonly view = computed(() => { const owner = this.owner(); return owner ? this.commands.ownerView(owner) : undefined; });
  readonly entries = computed(() => {
    const owner = this.owner(), account = this.workspace.account();
    if (!owner || !account) return [];
    return (this.view()?.records ?? []).flatMap(record => {
      const read = readHomeDashboard(record);
      if (read.state === 'valid' && !homeDashboardVisible(record, { account, meters: this.workspace.meters() })) return [];
      return [{ record, read, name: read.state === 'valid' ? read.value.name : 'Unavailable dashboard', route: homeDashboardRoute(owner, record.guid) }];
    });
  });
  readonly defaultGuid = computed(() => this.view()?.defaultDashboardGuid ?? this.entries().find(item => item.read.state === 'valid')?.record.guid);
  readonly configuredDefaultGuid = computed(() => {
    const view = this.view();
    return view?.record && view.state ? homeOwnerResolutionState(view.record, view.state).defaultDashboardGuid : undefined;
  });
  readonly selectedGuid = computed(() => this.context.routeState().homeDashboardGuid ?? this.defaultGuid());
  readonly selected = computed(() => this.entries().find(item => item.record.guid === this.selectedGuid()));
  readonly definition = computed(() => { const read = this.selected()?.read; return read?.state === 'valid' ? read.value : undefined; });
  readonly widgets = computed(() => {
    const owner = this.owner();
    const water = this.workspace.meters().some(meter => meter.accountId === this.workspace.account()?.guid
      && (owner?.kind === 'account' || meter.facilityId === owner?.guid) && ['Water Intake', 'Water Discharge'].includes(meter.source));
    return (this.definition()?.widgets ?? []).filter(widget => widget.visibility === 'always'
      || widget.visibility === 'water' && water || widget.visibility === 'emissions' && this.workspace.account()?.displayEmissions);
  });
  readonly widgetShells = computed(() => this.widgets().map(widget => {
    const record = this.selected()!.record, read = readHomeWidget(record, widget.id);
    if (read.state === 'repair-required') return { widget, state: 'repair-required' as const,
      message: 'This widget has preserved unavailable relationships. Its saved intent is retained; source repair will be available in a later Home update.' };
    if (widget.kind === 'visualization') {
      const chart = this.workspace.savedVisualizations().find(chart => chart.guid === widget.visualizationGuid && chart.accountId === record.accountId);
      if (!chart) return { widget, state: 'missing-source' as const, message: 'The linked saved visualization is unavailable. Its reference is preserved.' };
      const chartRead = readSavedVisualization(chart);
      if (chartRead.state !== 'valid' && chartRead.state !== 'setup-required') return { widget, state: chartRead.state,
        message: 'The linked saved visualization needs review or a compatible version. Its reference is preserved.' };
      return { widget, state: 'deferred' as const, message: 'Saved visualization linked. Chart display will be available in a later Home update.' };
    }
    return { widget, state: 'deferred' as const, message: 'This widget’s content will be available in a later Home update.' };
  }));
  readonly ownerRoute = computed(() => { const owner = this.owner(); return owner ? homeOwnerRoute(owner) : ['/v1']; });
  readonly defaultRoute = computed(() => { const owner = this.owner(), guid = this.defaultGuid(); return owner && guid ? homeDashboardRoute(owner, guid) : this.ownerRoute(); });
  readonly missing = computed(() => !!this.context.routeState().homeDashboardGuid && !this.selected());
}
