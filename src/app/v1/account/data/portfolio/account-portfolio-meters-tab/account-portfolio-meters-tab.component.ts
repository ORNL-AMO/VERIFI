import { BrowseKey, rememberBrowseForm } from '@app/v1/shared/navigation/browse-state/browse-state.service';
import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { buildPortfolioMeters, filterPortfolioMeters, PortfolioMeterSort, PortfolioMeterStatusFilter } from '../portfolio-meter.view';
import { PortfolioInventoryState } from '../portfolio-inventory-state';
import { meterTiles, orderPortfolioMeters } from '../portfolio-tile.views';

@Component({
  selector: 'app-account-portfolio-meters-tab',
  templateUrl: './account-portfolio-meters-tab.component.html',
  styleUrls: ['./account-portfolio-meters-tab.component.css'],
  standalone: false
})
export class AccountPortfolioMetersTabComponent {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly status = inject(WorkspaceStatusService);
  private readonly router = inject(Router);
  private readonly navigation = inject(WorkspaceNavigationService);
  readonly filtersForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    status: new FormControl<PortfolioMeterStatusFilter>('all', { nonNullable: true }),
    sort: new FormControl<PortfolioMeterSort>('attention', { nonNullable: true })
  });
  readonly browseKey = computed<BrowseKey<'meters'> | undefined>(() => {
    const account = this.workspace.account();
    return account ? { accountGuid: account.guid, kind: 'meters' } : undefined;
  });
  readonly filters = rememberBrowseForm(this.browseKey, this.filtersForm);
  readonly browseReady = computed(() => this.workspace.canWrite() && !['idle', 'evaluating'].includes(this.status.state()) && this.inventory.ready());
  readonly navigationError = signal('');
  private readonly allMeters = computed(() => buildPortfolioMeters({
    facilities: this.workspace.facilities(), meters: this.workspace.meters(), readings: this.workspace.meterData(),
    groups: this.workspace.meterGroups(), findings: this.status.items(), statusState: this.status.state()
  }));
  readonly meters = computed(() => {
    const guid = this.navigation.inventoryFacilityGuid();
    return this.allMeters().filter(item => !guid || item.facility.guid === guid);
  });
  readonly filteredMeters = computed(() => orderPortfolioMeters(filterPortfolioMeters(this.meters(), this.filters().search, this.filters().status), this.filters().sort));
  readonly tiles = computed(() => meterTiles(this.filteredMeters(), this.navigation, this.workspace.meterData()));
  readonly inventory = new PortfolioInventoryState(this.browseKey, this.tiles, computed(() => this.meters().map(item => item.meter.guid)), computed(() => ({ ...this.filters(), facility: this.navigation.inventoryFacilityGuid() })), this.workspace.canWrite);

  readonly browseIds = this.inventory.visibleIds;

  clearFilters(): void { this.filtersForm.reset({ search: '', status: 'all', sort: 'attention' }); }
  async navigateRoute(route: readonly string[]): Promise<void> {
    this.navigationError.set('');
    try { await this.router.navigate([...route]); } catch { this.navigationError.set('The meter could not be opened. Please try again.'); }
  }

}
