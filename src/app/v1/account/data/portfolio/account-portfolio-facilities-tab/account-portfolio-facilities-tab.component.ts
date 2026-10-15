import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { FacilitySort, FacilityStatusFilter, buildPortfolioFacilities, filterPortfolioFacilities } from '../portfolio-facility.view';

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
  private readonly workspaceService = inject(AccountWorkspaceService);
  private readonly router = inject(Router);
  readonly filtersForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    status: new FormControl<FacilityStatusFilter>('all', { nonNullable: true }),
    sort: new FormControl<FacilitySort>('facilityName', { nonNullable: true })
  });
  readonly filters = toSignal(this.filtersForm.valueChanges, { initialValue: this.filtersForm.getRawValue() });
  readonly navigationError = signal('');
  readonly facilitySummaries = computed(() => buildPortfolioFacilities({
    facilities: this.workspace.facilities(), meters: this.workspace.meters(), meterData: this.workspace.meterData(),
    predictors: this.workspace.predictors(), predictorData: this.workspace.predictorData(),
    analyses: this.workspace.facilityAnalyses(), reports: this.workspace.facilityReports(), equipment: this.workspace.energyUseEquipment(),
    findings: this.status.items(), statusState: this.status.state()
  }));
  readonly filteredSummaries = computed(() => {
    const filters = this.filters();
    return filterPortfolioFacilities(this.facilitySummaries(), filters.search, filters.status, filters.sort);
  });

  clearFilters(): void { this.filtersForm.reset({ search: '', status: 'all', sort: 'facilityName' }); }

  async openFacility(guid: string): Promise<void> {
    if (!this.workspace.facilities().some(facility => facility.guid === guid)) return;
    this.navigationError.set('');
    try {
      this.workspaceService.selectFacility(guid);
      await this.router.navigate(this.navigation.facilityDataRoute(guid, 'meters'));
    } catch {
      this.navigationError.set('The facility could not be opened. Please try again.');
    }
  }
}
