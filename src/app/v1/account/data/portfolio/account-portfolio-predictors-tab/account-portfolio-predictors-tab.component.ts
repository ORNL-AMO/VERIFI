import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { buildPredictorCards, buildWeatherStationGroups } from '@app/v1/facility/data/predictors/models';
import { buildPredictorInventory, filterPredictorInventory, PredictorInventorySort, PredictorStatusFilter, PredictorTypeFilter } from '@app/v1/facility/data/predictors/predictor-inventory/predictor-inventory.models';
import { PortfolioInventoryState } from '../portfolio-inventory-state';
import { predictorTiles, orderPortfolioPredictors } from '../portfolio-tile.views';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { BrowseKey, rememberBrowseForm } from '@app/v1/shared/navigation/browse-state/browse-state.service';

@Component({ selector: 'app-account-portfolio-predictors-tab', standalone: false,
  templateUrl: './account-portfolio-predictors-tab.component.html', styleUrls: ['./account-portfolio-predictors-tab.component.css'] })
export class AccountPortfolioPredictorsTabComponent {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly status = inject(WorkspaceStatusService);
  private readonly router = inject(Router);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly filtersForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }), type: new FormControl<PredictorTypeFilter>('all', { nonNullable: true }),
    status: new FormControl<PredictorStatusFilter>('all', { nonNullable: true }), sort: new FormControl<PredictorInventorySort>('attention', { nonNullable: true }),
    facilityGuid: new FormControl('', { nonNullable: true })
  });
  readonly browseKey = computed<BrowseKey<'predictors'> | undefined>(() => {
    const account = this.workspace.account(); return account ? { kind: 'predictors', accountGuid: account.guid } : undefined;
  });
  readonly filters = rememberBrowseForm(this.browseKey, this.filtersForm);
  readonly layoutReady = signal(false);
  readonly browseReady = computed(() => this.workspace.canWrite() && !['idle', 'evaluating'].includes(this.status.state()) && this.inventory.ready() && this.layoutReady());
  readonly navigationError = signal('');
  readonly entries = computed(() => this.workspace.facilities().flatMap(facility => {
    const predictors = this.workspace.predictors().filter(item => item.facilityId === facility.guid);
    const readings = this.workspace.predictorData().filter(item => item.facilityId === facility.guid);
    return buildPredictorInventory(buildPredictorCards(predictors, readings, this.status.items(), this.status.state() === 'ready'),
      buildWeatherStationGroups(predictors, readings, this.status.items(), this.status.state() === 'ready'), facility, this.status.state());
  }));
  readonly facilities = computed(() => [...this.workspace.facilities()].sort((a,b) => a.name.localeCompare(b.name) || a.guid.localeCompare(b.guid)));
  readonly filteredEntries = computed(() => orderPortfolioPredictors(filterPredictorInventory(this.entries(), this.filters())
    .filter(item => !this.filters().facilityGuid || item.facility.guid === this.filters().facilityGuid), this.filters().sort));
  readonly tiles = computed(() => predictorTiles(this.filteredEntries(), this.navigation, this.workspace.predictorData(), this.status.state()));
  readonly inventory = new PortfolioInventoryState(this.browseKey, this.tiles, computed(() => this.entries().map(item => item.guid)), this.filters, this.workspace.canWrite);
  readonly browseIds = this.inventory.visibleIds;
  clearFilters(): void { this.filtersForm.reset({ search: '', status: 'all', type: 'all', sort: 'attention', facilityGuid: '' }); }
  navigateRoute(route: readonly string[]): void { this.navigate([...route]); }
  private navigate(route: string[]): void {
    this.navigationError.set('');
    void this.router.navigate(route).catch(() => this.navigationError.set('The predictor could not be opened. Please try again.'));
  }
}
