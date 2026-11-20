import { HomeViewResolver, homeEntryKey } from './home-view-resolver.service';
import { homeShortcutChoices, homeWidgetView } from './home-widget-view';
import { homeRouteOwner } from './home-route-owner';
import { Injectable, computed, inject } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { HomeCommands } from '@data/account-workspace/home-commands.service';
import { homeOwnerResolutionState } from '@data/home/home-references';
import { HomeOwner } from '@domain/home/home-dashboard';
import { WorkspaceContextService } from '@app/v1/shell/workspace-context.service';
import { homeOwnerRoute } from '@app/v1/routing/workspace-route';

/** Read-only accepted route + committed workspace projection. Entry never initializes records. */
@Injectable({ providedIn: 'root' })
export class HomeContext {
  readonly workspace = inject(AccountWorkspaceStore);
  readonly context = inject(WorkspaceContextService);
  private readonly commands = inject(HomeCommands);
  private readonly resolver = inject(HomeViewResolver);
  readonly resolved = computed(() => { const owner = this.owner(); return owner ? this.resolver.resolve(owner) : undefined; });
  readonly owner = computed<HomeOwner | undefined>(() => {
    const account = this.workspace.account(), route = this.context.routeState();
    return this.workspace.isReady() && account ? homeRouteOwner(account, this.workspace.facilities(), route) : undefined;
  });
  readonly ownerName = computed(() => {
    const owner = this.owner();
    return owner?.kind === 'facility' ? this.workspace.facilities().find(item => item.guid === owner.guid)?.name
      : owner ? this.workspace.account()?.name : undefined;
  });
  readonly view = computed(() => { const owner = this.owner(); return owner ? this.commands.ownerView(owner) : undefined; });
  readonly entries = computed(() => this.resolved()?.entries ?? []);
  readonly defaultGuid = computed(() => { const ref = this.resolved()?.default; return ref ? homeEntryKey(ref) : undefined; });
  readonly configuredDefaultGuid = computed(() => {
    const view = this.view();
    const state = view?.record && view.state ? homeOwnerResolutionState(view.record, view.state) : view?.state;
    return state?.views ? state.views.default ? homeEntryKey(state.views.default) : undefined : state?.defaultDashboardGuid;
  });
  readonly selectedGuid = computed(() => {
    const route = this.context.routeState();
    return route.detail === 'built-in' ? route.homeBuiltIn ? homeEntryKey(route.homeBuiltIn) : '__unavailable-built-in__'
      : route.homeDashboardGuid ?? this.defaultGuid();
  });
  readonly selected = computed(() => this.entries().find(item => item.key === this.selectedGuid()));
  readonly definition = computed(() => { const read = this.selected()?.read; return read?.state === 'valid' ? read.value : undefined; });
  readonly widgets = computed(() => {
    const owner = this.owner();
    const water = this.workspace.meters().some(meter => meter.accountId === this.workspace.account()?.guid
      && (owner?.kind === 'account' || meter.facilityId === owner?.guid) && ['Water Intake', 'Water Discharge'].includes(meter.source));
    return (this.definition()?.widgets ?? []).filter(widget => widget.visibility === 'always'
      || widget.visibility === 'water' && water || widget.visibility === 'emissions' && this.workspace.account()?.displayEmissions);
  });
  readonly shortcutChoices = computed(() => { const snapshot = this.workspace.snapshot(); return snapshot ? homeShortcutChoices(snapshot) : []; });
  readonly widgetShells = computed(() => {
    const entry = this.selected(), snapshot = this.workspace.snapshot();
    return entry && snapshot ? this.widgets().map(widget => homeWidgetView(entry.record ?? { accountId: snapshot.account.guid }, widget, snapshot, [], this.shortcutChoices())) : [];
  });
  readonly ownerRoute = computed(() => { const owner = this.owner(); return owner ? homeOwnerRoute(owner) : ['/v1']; });
  readonly defaultRoute = computed(() => this.entries().find(entry => entry.key === this.defaultGuid())?.route ?? this.ownerRoute());
  readonly missing = computed(() => (!!this.context.routeState().homeDashboardGuid || this.context.routeState().detail === 'built-in') && !this.selected());
}
