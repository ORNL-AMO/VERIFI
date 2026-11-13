import { Component, computed, inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { FormControl, FormGroup } from '@angular/forms';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { InventoryTileActionRequest, InventoryTileMenuAction } from '@app/v1/shared/inventory/inventory.models';
import { InventoryViewState } from '@app/v1/shared/inventory/inventory-view-state';
import { BrowseKey, rememberBrowseForm } from '@app/v1/shared/navigation/browse-state/browse-state.service';
import { inventoryScopeBreadcrumbs } from '@app/v1/shared/page-identity/page-identity.component';
import { VisualizationNavigationService } from '../visualization-navigation.service';
import { visualizationDataSourceChoices } from '../visualization-data-sources';
import { LibraryLifecycle } from './lifecycle/library-lifecycle.service';
import { DEFAULT_VISUALIZATION_FILTERS, VisualizationLibraryFilters,
  buildVisualizationLibrary, filterVisualizationLibrary, visualizationLibraryTile } from './visualization-library.models';

@Component({ selector: 'app-visualization-library', standalone: false, host: { class: 'v1-inventory-dashboard-host' }, providers: [LibraryLifecycle],
  templateUrl: './library.component.html', styleUrls: ['./library.component.css'] })
export class LibraryComponent {
  readonly workspace = inject(AccountWorkspaceStore);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly lifecycle = inject(LibraryLifecycle);
  private readonly workspaceService = inject(AccountWorkspaceService);
  private readonly visualizations = inject(VisualizationNavigationService);
  readonly dataSources = visualizationDataSourceChoices();
  readonly singleFacility = this.navigation.isSingleSiteWorkspace;
  readonly scopedFacilityGuid = computed(() => this.singleFacility() ? undefined : this.navigation.inventoryFacilityGuid());
  readonly facilityOnly = computed(() => !!this.scopedFacilityGuid());
  readonly browseKey = computed<BrowseKey<'visualizations'> | undefined>(() => {
    const account = this.workspace.account();
    return account && this.workspace.status() === 'ready' && this.navigation.routeState().accountGuid === account.guid
      ? { kind: 'visualizations', accountGuid: account.guid, facilityGuid: this.scopedFacilityGuid() } : undefined;
  });
  readonly filtersForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    scope: new FormControl<VisualizationLibraryFilters['scope']>('all', { nonNullable: true }),
    sourceKind: new FormControl<VisualizationLibraryFilters['sourceKind']>('all', { nonNullable: true }),
    status: new FormControl<VisualizationLibraryFilters['status']>('all', { nonNullable: true }),
    sort: new FormControl<VisualizationLibraryFilters['sort']>('modified', { nonNullable: true })
  });
  private readonly rememberedFilters = rememberBrowseForm(this.browseKey, this.filtersForm);
  readonly filters = computed(() => ({ ...this.rememberedFilters(), ...(this.facilityOnly() ? { scope: 'facility' as const }
    : this.singleFacility() ? { scope: 'all' as const } : {}) }));
  readonly entries = computed(() => {
    const snapshot = this.workspace.snapshot();
    const entries = snapshot && this.browseKey() ? buildVisualizationLibrary(snapshot) : [];
    return this.facilityOnly() ? entries.filter(entry => entry.facilityGuid === this.scopedFacilityGuid()) : entries;
  });
  readonly filteredEntries = computed(() => filterVisualizationLibrary(this.entries(), this.filters()));
  readonly tiles = computed(() => this.filteredEntries().map(entry => visualizationLibraryTile(entry,
    this.visualizations.workbenchRoute(entry.record.accountId, entry.record.guid), this.visualizations.dashboardRoute(entry.record.accountId))));
  readonly inventory = new InventoryViewState(this.browseKey, this.tiles, computed(() => this.entries().map(entry => entry.record.guid)),
    computed(() => ({ ...this.filters(), facilityGuid: this.scopedFacilityGuid() })), this.workspace.isReady);
  readonly browseReady = computed(() => !!this.browseKey() && this.inventory.ready());
  readonly canAct = computed(() => !!this.browseKey() && this.lifecycle.canAct() && !this.lifecycle.editor() && !this.lifecycle.proposal());
  readonly menuActions = computed<Readonly<Record<string, readonly InventoryTileMenuAction[]>>>(() => Object.fromEntries(this.entries().map(entry => [entry.record.guid, [
    { id: 'rename', label: 'Rename visualization', icon: 'edit', disabled: !this.canAct() || !entry.editable, disabledReason: !entry.editable ? 'This saved format is read-only.' : undefined },
    { id: 'copy', label: 'Duplicate visualization', icon: 'copy', disabled: !this.canAct() || !entry.editable },
    { id: 'copy-scope', label: 'Duplicate to another scope', icon: 'copy', disabled: !this.canAct() || !entry.editable },
    { id: 'delete', label: 'Delete visualization', icon: 'delete', disabled: !this.canAct() }
  ]])));
  readonly breadcrumbs = computed(() => inventoryScopeBreadcrumbs(this.workspace.account()?.name || 'Account',
    this.workspace.facilities().find(item => item.guid === this.scopedFacilityGuid())?.name, this.singleFacility()));
  readonly countLabel = computed(() => `${this.filteredEntries().length} of ${this.entries().length} visualizations`);
  readonly unavailable = computed(() => !this.workspace.account() || this.navigation.routeState().accountGuid !== this.workspace.account()?.guid);

  clearFilters(): void { this.filtersForm.reset(DEFAULT_VISUALIZATION_FILTERS); }
  openCreate(): void { if (this.canAct()) this.lifecycle.openCreate(); }
  requestAction(request: InventoryTileActionRequest): void {
    if (!this.canAct()) return;
    const entry = this.entries().find(item => item.record.guid === request.guid);
    if (!entry) return;
    if (request.action === 'rename') this.lifecycle.rename(entry);
    if (request.action === 'copy') void this.lifecycle.duplicate(entry);
    if (request.action === 'copy-scope') void this.lifecycle.duplicateToScope(entry);
    if (request.action === 'delete') this.lifecycle.requestDelete(entry);
  }
  async openRoute(route: readonly string[]): Promise<void> {
    const entry = this.entries().find(item => item.record.guid === route[route.length - 1]);
    if (!entry || !await this.lifecycle.resolveLeave()) return;
    this.visualizations.rememberReturn(entry.record.accountId, this.scopedFacilityGuid());
    if (!await this.visualizations.open(entry.record.accountId, entry.record.guid)) this.lifecycle.error.set('The visualization could not be opened. Please try again.');
  }
  async retryLoad(): Promise<void> {
    const guid = this.navigation.routeState().accountGuid;
    if (guid) await this.workspaceService.selectAccount(guid);
  }
  hasUnsavedChanges(): boolean { return this.lifecycle.needsProtection(); }
  isNavigationBlocked(): boolean { return this.lifecycle.saving(); }
  resolveLeave(): Promise<boolean> { return this.lifecycle.resolveLeave(); }
}
export const libraryLeaveGuard: CanDeactivateFn<LibraryComponent> = component => component.resolveLeave();
