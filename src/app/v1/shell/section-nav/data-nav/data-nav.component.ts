import { Component, computed, inject } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { ACCOUNT_CUSTOM_DATA_ITEMS, buildResourceNavGroups } from '../models';
import { AccountPortfolioTab } from '@app/v1/shell/workspace-navigation.service';
import { IconName } from '@app/v1/shared/icons/icon-registry';

const PORTFOLIO_LINKS: ReadonlyArray<{ id: AccountPortfolioTab; label: string; icon: IconName }> = [
  { id: 'facilities', label: 'Facilities', icon: 'facility' },
  { id: 'meters', label: 'Meters', icon: 'meter' },
  { id: 'predictors', label: 'Predictors', icon: 'predictor' },
  { id: 'energy-uses', label: 'Energy Uses', icon: 'tools' }
];

@Component({
  selector: 'app-data-nav',
  templateUrl: './data-nav.component.html',
  styleUrls: ['./data-nav.component.css'],
  standalone: false
})
export class DataNavComponent {
  readonly navigation = inject(WorkspaceNavigationService);
  readonly status = inject(WorkspaceStatusService);
  private readonly workspace = inject(AccountWorkspaceStore);
  readonly facilityContext = computed(() => this.navigation.contextMode() === 'facility' && !!this.navigation.facility());
  readonly dataTitle = computed(() => this.navigation.contextMode() === 'facility' ? 'Facility Data' : 'Account Data');
  readonly portfolioLinks = computed(() => {
    const account = this.navigation.account();
    if (!account || this.facilityContext()) return [];
    return PORTFOLIO_LINKS.map(link => ({
      ...link,
      active: this.navigation.activeSection() === 'data' && this.navigation.activeDetail() === 'portfolio'
        && (this.navigation.activePortfolioTab() || 'facilities') === link.id,
      route: this.navigation.accountPortfolioRoute(account.guid, link.id)
    }));
  });
  readonly groups = computed(() => {
    const facility = this.navigation.facility();
    if (!this.facilityContext() || !facility) return [];
    return buildResourceNavGroups({
      facilityGuid: facility.guid, detail: this.navigation.activeSection() === 'data' ? this.navigation.activeDetail() : '',
      activeMeterGuid: this.navigation.activeMeterGuid(), activeGroupGuid: this.navigation.activeMeterGroupGuid(),
      activePredictorGuid: this.navigation.activePredictorGuid(), activeWeatherKey: this.navigation.activeWeatherPredictorGroupKey(),
      meters: this.workspace.facilityMeters(), groups: this.workspace.facilityMeterGroups(),
      predictors: this.workspace.facilityPredictors(), predictorData: this.workspace.facilityPredictorData(),
      findings: this.status.items(), statusReady: this.status.state() === 'ready'
    }, this.navigation);
  });
  readonly primaryLink = computed(() => {
    const facility = this.navigation.facility();
    const account = this.navigation.account();
    return this.facilityContext() && facility
      ? { label: 'Energy Uses', icon: 'tools' as const, active: this.navigation.activeDetail() === 'energy-uses', route: this.navigation.facilityDataRoute(facility.guid, 'energy-uses') }
      : { label: 'Portfolio', icon: 'portfolio' as const, active: this.navigation.activeDetail() === 'portfolio', route: account ? this.navigation.accountDataRoute(account.guid, 'portfolio') : [] };
  });
  readonly customLinks = computed(() => {
    const account = this.navigation.account();
    const facility = this.navigation.facility();
    const items = account?.displayEmissions ? ACCOUNT_CUSTOM_DATA_ITEMS : ACCOUNT_CUSTOM_DATA_ITEMS.filter(item => item.id === 'custom-fuels');
    return items.map(item => ({
      ...item, active: this.navigation.activeDetail() === item.id,
      route: this.facilityContext() && facility ? this.navigation.facilityDataRoute(facility.guid, item.id)
        : account ? this.navigation.accountDataRoute(account.guid, item.id) : []
    }));
  });
}
