import { BrowseKey, rememberBrowseForm } from '@app/v1/shared/navigation/browse-state/browse-state.service';
import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { FacilitySort, FacilityStatusFilter, buildPortfolioFacilities, filterPortfolioFacilities } from '../portfolio-facility.view';
import { PortfolioInventoryState } from '../portfolio-inventory-state';
import { facilityTiles } from '../portfolio-tile.views';

@Component({
  selector: 'app-account-portfolio-facilities-tab',
  templateUrl: './account-portfolio-facilities-tab.component.html',
  styleUrls: ['./account-portfolio-facilities-tab.component.css'],
  standalone: false
})
export class AccountPortfolioFacilitiesTabComponent {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly status = inject(WorkspaceStatusService);
  private readonly navigation = inject(WorkspaceNavigationService);
  private readonly router = inject(Router);
  readonly filtersForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    status: new FormControl<FacilityStatusFilter>('all', { nonNullable: true }),
    sort: new FormControl<FacilitySort>('facilityName', { nonNullable: true })
  });
  readonly browseKey = computed<BrowseKey<'facilities'> | undefined>(() => {
    const account = this.workspace.account();
    return account ? { accountGuid: account.guid, kind: 'facilities' } : undefined;
  });
  readonly filters = rememberBrowseForm(this.browseKey, this.filtersForm);
  readonly browseReady = computed(() => this.workspace.canWrite() && !['idle', 'evaluating'].includes(this.status.state()) && this.inventory.ready());
  readonly navigationError = signal('');
  readonly facilityInput = computed(() => ({
    facilities: this.workspace.facilities(), meters: this.workspace.meters(), meterData: this.workspace.meterData(),
    predictors: this.workspace.predictors(), predictorData: this.workspace.predictorData(),
    equipment: this.workspace.energyUseEquipment(),
    findings: this.status.items(), statusState: this.status.state()
  }));
  readonly facilitySummaries = computed(() => buildPortfolioFacilities(this.facilityInput()));
  readonly filteredSummaries = computed(() => {
    const filters = this.filters();
    return filterPortfolioFacilities(this.facilitySummaries(), filters.search, filters.status, filters.sort);
  });

  readonly tiles = computed(() => facilityTiles(this.filteredSummaries(), this.facilityInput(), this.navigation));
  readonly inventory = new PortfolioInventoryState(this.browseKey, this.tiles, computed(() => this.facilitySummaries().map(item => item.facility.guid)), this.filters, this.workspace.canWrite);
  readonly browseIds = this.inventory.visibleIds;

  async navigateRoute(route: readonly string[]): Promise<void> {
    this.navigationError.set('');
    try { await this.router.navigate([...route]); } catch { this.navigationError.set('The facility could not be opened. Please try again.'); }
  }

  clearFilters(): void { this.filtersForm.reset({ search: '', status: 'all', sort: 'facilityName' }); }

}
