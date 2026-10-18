import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { buildPredictorCards, buildWeatherStationGroups } from '@app/v1/facility/data/predictors/models';
import { buildPredictorInventory, filterPredictorInventory, groupPortfolioPredictors, PredictorInventoryActionRequest, PredictorInventorySort, PredictorStatusFilter, PredictorTypeFilter } from '@app/v1/facility/data/predictors/predictor-inventory/predictor-inventory.models';
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
    status: new FormControl<PredictorStatusFilter>('all', { nonNullable: true }), sort: new FormControl<PredictorInventorySort>('attention', { nonNullable: true })
  });
  readonly browseKey = computed<BrowseKey<'predictors'> | undefined>(() => {
    const account = this.workspace.account(); return account ? { kind: 'predictors', accountGuid: account.guid } : undefined;
  });
  readonly filters = rememberBrowseForm(this.browseKey, this.filtersForm);
  readonly browseReady = computed(() => this.workspace.canWrite() && !['idle', 'evaluating'].includes(this.status.state()));
  readonly navigationError = signal('');
  readonly entries = computed(() => this.workspace.facilities().flatMap(facility => {
    const predictors = this.workspace.predictors().filter(item => item.facilityId === facility.guid);
    const readings = this.workspace.predictorData().filter(item => item.facilityId === facility.guid);
    return buildPredictorInventory(buildPredictorCards(predictors, readings, this.status.items(), this.status.state() === 'ready'),
      buildWeatherStationGroups(predictors, readings, this.status.items(), this.status.state() === 'ready'), facility, this.status.state());
  }));
  readonly filteredEntries = computed(() => filterPredictorInventory(this.entries(), this.filters()));
  readonly facilityGroups = computed(() => groupPortfolioPredictors(this.filteredEntries(), this.filters().sort));
  readonly singleFacility = computed(() => new Set(this.entries().map(item => item.facility.guid)).size === 1);
  readonly browseIds = computed(() => [...this.filteredEntries().map(item => item.guid), ...this.facilityGroups().map(item => item.facility.guid)]);
  clearFilters(): void { this.filtersForm.reset({ search: '', status: 'all', type: 'all', sort: 'attention' }); }
  open(request: PredictorInventoryActionRequest): void {
    const entry = this.entries().find(item => item.guid === request.guid);
    if (!entry) return;
    this.navigate(entry.station ? this.navigation.facilityWeatherPredictorRoute(entry.facility.guid, entry.station.routeKey)
      : this.navigation.facilityPredictorRoute(entry.facility.guid, entry.guid, 'settings'));
  }
  openStation(facilityGuid: string, key: string): void { this.navigate(this.navigation.facilityWeatherPredictorRoute(facilityGuid, key)); }
  private navigate(route: string[]): void {
    this.navigationError.set('');
    void this.router.navigate(route).catch(() => this.navigationError.set('The predictor could not be opened. Please try again.'));
  }
}
