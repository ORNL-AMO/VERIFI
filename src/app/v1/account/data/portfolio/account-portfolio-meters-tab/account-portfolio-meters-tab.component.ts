import { BrowseKey, rememberBrowseForm } from '@app/v1/shared/navigation/browse-state/browse-state.service';
import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { buildPortfolioMeters, filterPortfolioMeters, groupPortfolioMeters, PortfolioMeterSort, PortfolioMeterStatusFilter } from '../portfolio-meter.view';

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
  readonly browseReady = computed(() => this.workspace.canWrite() && !['idle', 'evaluating'].includes(this.status.state()));
  readonly navigationError = signal('');
  readonly meters = computed(() => buildPortfolioMeters({
    facilities: this.workspace.facilities(), meters: this.workspace.meters(), readings: this.workspace.meterData(),
    groups: this.workspace.meterGroups(), findings: this.status.items(), statusState: this.status.state()
  }));
  readonly filteredMeters = computed(() => filterPortfolioMeters(this.meters(), this.filters().search, this.filters().status));
  readonly facilityGroups = computed(() => groupPortfolioMeters(this.filteredMeters(), this.filters().sort).map(group => ({
    ...group, facilityRoute: this.navigation.facilityDataRoute(group.facility.guid, 'meters')
  })));
  readonly singleFacility = computed(() => new Set(this.meters().map(item => item.facility.guid)).size === 1);

  readonly browseIds = computed(() => [...this.filteredMeters().map(item => item.meter.guid), ...this.facilityGroups().map(item => item.facility.guid)]);

  clearFilters(): void { this.filtersForm.reset({ search: '', status: 'all', sort: 'attention' }); }

  async openMeter(guid: string): Promise<void> {
    const item = this.meters().find(meter => meter.meter.guid === guid);
    if (!item) return;
    this.navigationError.set('');
    try {
      await this.router.navigate(this.navigation.facilityMeterRoute(item.facility.guid, guid, 'settings'));
    } catch {
      this.navigationError.set('The meter could not be opened. Please try again.');
    }
  }
}
