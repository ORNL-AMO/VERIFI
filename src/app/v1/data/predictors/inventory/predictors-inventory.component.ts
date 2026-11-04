import { buildPredictorTiles } from './predictor-tile.view';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { buildPredictorCards, buildWeatherStationGroups } from '../models';
import { buildPredictorInventory, filterPredictorInventory, PredictorInventorySort, PredictorStatusFilter, PredictorTypeFilter } from './predictor-inventory.models';
import { InventoryViewState } from '@app/v1/shared/inventory/inventory-view-state';
import { orderPortfolioPredictors } from '@app/v1/data/inventory/data-inventory-tiles.view';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { BrowseKey, rememberBrowseForm } from '@app/v1/shared/navigation/browse-state/browse-state.service';
import { InventoryHeaderActionsRegistry } from '@app/v1/data/inventory/inventory-header-actions.service';
import { InventorySelectionController } from '@app/v1/data/inventory/selection/inventory-selection.controller';
import { InventoryChartController } from '@app/v1/data/inventory/charts/inventory-chart.controller';
import { InventoryToolsSource } from '@app/v1/data/inventory/inventory-tools.models';

@Component({ selector: 'app-predictors-inventory', standalone: false,
  templateUrl: './predictors-inventory.component.html', styleUrls: ['./predictors-inventory.component.css'] })
export class PredictorsInventoryComponent {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly status = inject(WorkspaceStatusService);
  private readonly router = inject(Router);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly filtersForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }), type: new FormControl<PredictorTypeFilter>('all', { nonNullable: true }),
    status: new FormControl<PredictorStatusFilter>('all', { nonNullable: true }), sort: new FormControl<PredictorInventorySort>('attention', { nonNullable: true })
  });
  readonly browseKey = computed<BrowseKey<'predictors'> | undefined>(() => {
    const account = this.workspace.account(); return account ? { kind: 'predictors', facilityGuid: this.navigation.inventoryFacilityGuid(), accountGuid: account.guid } : undefined;
  });
  readonly filters = rememberBrowseForm(this.browseKey, this.filtersForm);
  readonly browseReady = computed(() => this.workspace.canWrite() && !['idle', 'evaluating'].includes(this.status.state()) && this.inventory.ready());
  readonly navigationError = signal('');
  readonly entries = computed(() => this.workspace.facilities().filter(facility => !this.navigation.inventoryFacilityGuid() || facility.guid === this.navigation.inventoryFacilityGuid()).flatMap(facility => {
    const predictors = this.workspace.predictors().filter(item => item.facilityId === facility.guid);
    const readings = this.workspace.predictorData().filter(item => item.facilityId === facility.guid);
    return buildPredictorInventory(buildPredictorCards(predictors, readings, this.status.items(), this.status.state() === 'ready'),
      buildWeatherStationGroups(predictors, readings, this.status.items(), this.status.state() === 'ready'), facility, this.status.state());
  }));
  readonly filteredEntries = computed(() => orderPortfolioPredictors(filterPredictorInventory(this.entries(), this.filters()), this.filters().sort));
  readonly tiles = computed(() => buildPredictorTiles(this.filteredEntries(), this.navigation, this.workspace.predictorData(), this.status.state()));
  readonly inventory = new InventoryViewState(this.browseKey, this.tiles, computed(() => this.entries().map(item => item.guid)), computed(() => ({ ...this.filters(), facility: this.navigation.inventoryFacilityGuid() })), this.workspace.canWrite);
  readonly matchingGuids = computed(() => this.filteredEntries().map(item => item.guid));
  readonly scopeGuids = computed(() => this.entries().map(item => item.guid));
  readonly toolsFiltersKey = computed(() => JSON.stringify(this.filters()));
  readonly browseIds = this.inventory.visibleIds;
  readonly toolsSource: InventoryToolsSource = {
    context: computed(() => ({ accountGuid: this.workspace.account()?.guid,
      facilityGuid: this.navigation.inventoryFacilityGuid(), resource: 'predictors' as const })),
    matchingGuids: this.matchingGuids, scopeGuids: this.scopeGuids, filtersKey: this.toolsFiltersKey
  };
  readonly selection = new InventorySelectionController(this.toolsSource);
  readonly chart = new InventoryChartController(this.toolsSource);

  constructor() {
    const unregister = inject(InventoryHeaderActionsRegistry).register({
      resource: 'predictors', selecting: this.selection.selecting, canToggle: this.selection.canToggle,
      toggleSelection: () => this.selection.toggleSelection()
    });
    inject(DestroyRef).onDestroy(unregister);
  }
  clearFilters(): void { this.filtersForm.reset({ search: '', status: 'all', type: 'all', sort: 'attention' }); }
  navigateRoute(route: readonly string[]): void { this.navigate([...route]); }
  private navigate(route: string[]): void {
    this.navigationError.set('');
    void this.router.navigate(route).catch(() => this.navigationError.set('The predictor could not be opened. Please try again.'));
  }
}
