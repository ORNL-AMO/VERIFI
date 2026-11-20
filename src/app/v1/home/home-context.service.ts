import { homeShortcutChoices, homeWidgetView } from './home-widget-view';
import { homeRouteOwner } from './home-route-owner';
import { Injectable, computed, inject } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { HomeCommands } from '@data/account-workspace/home-commands.service';
import { readHomeDashboard } from '@data/home/home-record';
import { homeDashboardVisible, homeOwnerResolutionState } from '@data/home/home-references';
import { HomeOwner } from '@domain/home/home-dashboard';
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
    return this.workspace.isReady() && account ? homeRouteOwner(account, this.workspace.facilities(), route) : undefined;
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
  readonly shortcutChoices = computed(() => { const snapshot = this.workspace.snapshot(); return snapshot ? homeShortcutChoices(snapshot) : []; });
  readonly widgetShells = computed(() => {
    const record = this.selected()?.record, snapshot = this.workspace.snapshot();
    return record && snapshot ? this.widgets().map(widget => homeWidgetView(record, widget, snapshot, [], this.shortcutChoices())) : [];
  });
  readonly ownerRoute = computed(() => { const owner = this.owner(); return owner ? homeOwnerRoute(owner) : ['/v1']; });
  readonly defaultRoute = computed(() => { const owner = this.owner(), guid = this.defaultGuid(); return owner && guid ? homeDashboardRoute(owner, guid) : this.ownerRoute(); });
  readonly missing = computed(() => !!this.context.routeState().homeDashboardGuid && !this.selected());
}
