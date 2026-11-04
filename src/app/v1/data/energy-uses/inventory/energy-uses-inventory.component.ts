import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { InventoryTile } from '@app/v1/shared/inventory/inventory.models';
import { InventoryViewState } from '@app/v1/shared/inventory/inventory-view-state';
import { BrowseKey, rememberBrowseForm } from '@app/v1/shared/navigation/browse-state/browse-state.service';
import { EnergyUsesWorkspaceService } from '../energy-uses-workspace.service';
import { ENERGY_USE_FILTER_DEFAULTS, EnergyUseInventoryFilters, EnergyUseInventorySort, filterAndSortEnergyUses } from './energy-use-inventory.models';

@Component({
  selector: 'app-energy-uses-inventory',
  templateUrl: './energy-uses-inventory.component.html',
  styleUrls: ['./energy-uses-inventory.component.css'],
  standalone: false,
  providers: [EnergyUsesWorkspaceService]
})
export class EnergyUsesInventoryComponent {
  readonly workspace = inject(EnergyUsesWorkspaceService);
  readonly navigation = inject(WorkspaceNavigationService);
  private readonly router = inject(Router);
  readonly navigationError = signal('');
  readonly filtersForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    category: new FormControl('all', { nonNullable: true }),
    lifecycle: new FormControl<EnergyUseInventoryFilters['lifecycle']>('all', { nonNullable: true }),
    sort: new FormControl<EnergyUseInventorySort>('name', { nonNullable: true })
  });
  readonly browseKey = computed<BrowseKey<'energy-uses'> | undefined>(() => {
    const account = this.workspace.account();
    return account ? { kind: 'energy-uses', accountGuid: account.guid, facilityGuid: this.navigation.inventoryFacilityGuid() } : undefined;
  });
  readonly filters = rememberBrowseForm(this.browseKey, this.filtersForm);
  readonly entries = computed(() => this.workspace.entries().filter(entry => !this.navigation.inventoryFacilityGuid() || entry.facility.guid === this.navigation.inventoryFacilityGuid()));
  readonly categories = computed(() => [...new Set(this.entries().map(entry => entry.category))].sort());
  readonly filteredEntries = computed(() => filterAndSortEnergyUses(this.entries(), this.filters()));
  readonly tiles = computed<readonly InventoryTile[]>(() => this.filteredEntries().map(entry => ({
    guid: entry.guid, name: entry.name, icon: 'tools', chip: entry.category,
    route: ['/v1', 'workspace', 'facility', entry.facility.guid, 'data', 'energy-uses', entry.guid, 'settings'],
    owner: { facilityGuid: entry.facility.guid, label: entry.facility.name,
      route: this.navigation.accountPortfolioRoute(entry.facility.accountId, 'energy-uses'),
      queryParams: this.navigation.isSingleSiteWorkspace() ? {} : { facility: entry.facility.guid } },
    status: { tone: 'neutral', icon: 'info', label: entry.availability }, energyUseSnapshot: entry.snapshot
  })));
  readonly inventory = new InventoryViewState(this.browseKey, this.tiles,
    computed(() => this.entries().map(entry => entry.guid)), this.filters, this.workspace.ready);
  readonly browseReady = computed(() => this.workspace.ready() && this.inventory.ready());
  clearFilters(): void { this.filtersForm.reset(ENERGY_USE_FILTER_DEFAULTS); }
  navigateRoute(route: readonly string[]): void {
    this.navigationError.set('');
    void this.router.navigate([...route]).then(opened => {
      if (!opened) this.navigationError.set('The energy use could not be opened.');
    }).catch(() => this.navigationError.set('The energy use could not be opened. Please try again.'));
  }
}
