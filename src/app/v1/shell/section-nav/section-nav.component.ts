import { Component, computed, inject } from '@angular/core';
import { WorkspaceNavigationService } from '../workspace-navigation.service';

type SettingsNavItem = {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly tone?: 'danger';
};

type DataNavItem = {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
};

const ACCOUNT_DATA_ITEMS: ReadonlyArray<DataNavItem> = [
  { id: 'portfolio', label: 'Portfolio', icon: 'fa-layer-group' }
];

const ACCOUNT_SETTINGS_ITEMS: ReadonlyArray<SettingsNavItem> = [
  { id: 'profile', label: 'Profile', icon: 'fa-building' },
  { id: 'units', label: 'Units', icon: 'fa-ruler-combined' },
  { id: 'goals', label: 'Goals', icon: 'fa-bullseye' },
  { id: 'financial', label: 'Financial', icon: 'fa-calendar-days' },
  { id: 'staleness', label: 'Staleness', icon: 'fa-clock' },
  { id: 'backup', label: 'Backup', icon: 'fa-file-arrow-down' },
  { id: 'portfolio', label: 'Portfolio', icon: 'fa-layer-group' },
  { id: 'delete', label: 'Delete account', icon: 'fa-trash', tone: 'danger' }
];

const FACILITY_SETTINGS_ITEMS: ReadonlyArray<SettingsNavItem> = [
  { id: 'profile', label: 'Profile', icon: 'fa-industry' },
  { id: 'units', label: 'Units', icon: 'fa-ruler-combined' },
  { id: 'goals', label: 'Goals', icon: 'fa-bullseye' },
  { id: 'financial', label: 'Financial', icon: 'fa-calendar-days' },
  { id: 'staleness', label: 'Staleness', icon: 'fa-clock' },
  { id: 'backup', label: 'Backup', icon: 'fa-file-arrow-down' }
];

const PORTFOLIO_TRANSITION_ITEM: SettingsNavItem = { id: 'portfolio', label: 'Portfolio', icon: 'fa-layer-group' };

@Component({
  selector: 'app-section-nav',
  templateUrl: './section-nav.component.html',
  styleUrls: ['./section-nav.component.css'],
  standalone: false
})
export class SectionNavComponent {
  readonly navigation = inject(WorkspaceNavigationService);
  readonly isSingleSiteWorkspace = this.navigation.isSingleSiteWorkspace;
  readonly hasSingleSiteRecovery = this.navigation.hasSingleSiteRecovery;
  readonly dataItems = computed(() => ACCOUNT_DATA_ITEMS);
  readonly settingsItems = computed(() => {
    if (this.navigation.contextMode() !== 'facility') {
      return ACCOUNT_SETTINGS_ITEMS;
    }
    const account = this.navigation.account();
    const isSingleFacilityAccount = !!account?.isSingleFacilityCompany;
    const deleteLabel = isSingleFacilityAccount ? 'Delete account' : 'Delete facility';
    const facilityItems = isSingleFacilityAccount
      ? [...FACILITY_SETTINGS_ITEMS, PORTFOLIO_TRANSITION_ITEM]
      : FACILITY_SETTINGS_ITEMS;
    return [
      ...facilityItems,
      { id: 'delete', label: deleteLabel, icon: 'fa-trash', tone: 'danger' as const }
    ];
  });
  readonly settingsTitle = computed(() => {
    return this.navigation.contextMode() === 'facility' ? 'Facility Settings' : 'Account Settings';
  });
  readonly homeTitle = computed(() => {
    return this.navigation.contextMode() === 'facility' ? 'Facility Home' : 'Account Home';
  });
  readonly dataTitle = computed(() => 'Account Data');
  readonly recoveryTitle = computed(() =>
    this.navigation.singleSiteWorkspaceState() === 'missing-facility'
      ? 'Single-facility setup needs a facility'
      : 'Single-facility setup needs one facility'
  );
  readonly recoveryMessage = computed(() =>
    this.navigation.singleSiteWorkspaceState() === 'missing-facility'
      ? 'This account is marked as single-facility, but no facility is available yet.'
      : 'This account is marked as single-facility, but it has more than one facility.'
  );
}
