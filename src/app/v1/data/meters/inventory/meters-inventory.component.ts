import { BrowseKey, rememberBrowseForm } from '@app/v1/shared/navigation/browse-state/browse-state.service';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { buildMeterInventory, filterMeterInventory, MeterInventorySort, MeterInventoryStatusFilter } from './meter-inventory.view';
import { InventoryViewState } from '@app/v1/shared/inventory/inventory-view-state';
import { meterTiles, orderPortfolioMeters } from '@app/v1/data/inventory/data-inventory-tiles.view';
import { InventoryHeaderActionsRegistry } from '@app/v1/data/inventory/inventory-header-actions.service';
import { InventorySelectionController } from '@app/v1/data/inventory/selection/inventory-selection.controller';
import { InventoryChartController } from '@app/v1/data/inventory/charts/inventory-chart.controller';
import { InventoryToolsSource } from '@app/v1/data/inventory/inventory-tools.models';

@Component({
  selector: 'app-meters-inventory',
  templateUrl: './meters-inventory.component.html',
  styleUrls: ['./meters-inventory.component.css'],
  standalone: false
})
export class MetersInventoryComponent {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly status = inject(WorkspaceStatusService);
  private readonly router = inject(Router);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly filtersForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    status: new FormControl<MeterInventoryStatusFilter>('all', { nonNullable: true }),
    sort: new FormControl<MeterInventorySort>('attention', { nonNullable: true })
  });
  readonly browseKey = computed<BrowseKey<'meters'> | undefined>(() => {
    const account = this.workspace.account();
    return account ? { accountGuid: account.guid, kind: 'meters', facilityGuid: this.navigation.inventoryFacilityGuid() } : undefined;
  });
  readonly filters = rememberBrowseForm(this.browseKey, this.filtersForm);
  readonly browseReady = computed(() => this.workspace.canWrite() && !['idle', 'evaluating'].includes(this.status.state()) && this.inventory.ready());
  readonly navigationError = signal('');
  private readonly allMeters = computed(() => buildMeterInventory({
    facilities: this.workspace.facilities(), meters: this.workspace.meters(), readings: this.workspace.meterData(),
    groups: this.workspace.meterGroups(), findings: this.status.items(), statusState: this.status.state()
  }));
  readonly meters = computed(() => {
    const guid = this.navigation.inventoryFacilityGuid();
    return this.allMeters().filter(item => !guid || item.facility.guid === guid);
  });
  readonly filteredMeters = computed(() => orderPortfolioMeters(filterMeterInventory(this.meters(), this.filters().search, this.filters().status), this.filters().sort));
  readonly tiles = computed(() => meterTiles(this.filteredMeters(), this.navigation, this.workspace.meterData()));
  readonly inventory = new InventoryViewState(this.browseKey, this.tiles, computed(() => this.meters().map(item => item.meter.guid)), computed(() => ({ ...this.filters(), facility: this.navigation.inventoryFacilityGuid() })), this.workspace.canWrite);

  readonly matchingGuids = computed(() => this.filteredMeters().map(item => item.meter.guid));
  readonly scopeGuids = computed(() => this.meters().map(item => item.meter.guid));
  readonly toolsFiltersKey = computed(() => JSON.stringify(this.filters()));
  readonly browseIds = this.inventory.visibleIds;
  readonly toolsSource: InventoryToolsSource = {
    context: computed(() => ({ accountGuid: this.workspace.account()?.guid,
      facilityGuid: this.navigation.inventoryFacilityGuid(), resource: 'meters' as const })),
    matchingGuids: this.matchingGuids, scopeGuids: this.scopeGuids, filtersKey: this.toolsFiltersKey,
    captureSelection: computed(() => {
      const filters = this.filters(), facilityGuid = this.navigation.inventoryFacilityGuid();
      return filters.search.trim() || filters.status !== 'all'
        ? { state: 'unsupported' as const, reason: 'Clear search and Status filters before capturing this chart. Their current matching meaning cannot be preserved in a saved visualization.' }
        : { state: 'supported' as const, selection: { kind: 'rule' as const, resource: 'meter' as const,
          filter: { ...(facilityGuid ? { facilityGuids: [facilityGuid] } : {}), includeRetired: true } } };
    })
  };
  readonly selection = new InventorySelectionController(this.toolsSource);
  readonly chart = new InventoryChartController(this.toolsSource);

  constructor() {
    const unregister = inject(InventoryHeaderActionsRegistry).register({
      resource: 'meters', selecting: this.selection.selecting, canToggle: this.selection.canToggle,
      toggleSelection: () => this.selection.toggleSelection()
    });
    inject(DestroyRef).onDestroy(unregister);
  }

  clearFilters(): void { this.filtersForm.reset({ search: '', status: 'all', sort: 'attention' }); }
  async navigateRoute(route: readonly string[]): Promise<void> {
    this.navigationError.set('');
    try { await this.router.navigate([...route]); } catch { this.navigationError.set('The meter could not be opened. Please try again.'); }
  }

}
