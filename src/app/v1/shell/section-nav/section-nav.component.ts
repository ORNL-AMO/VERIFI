import { Component, computed, inject, signal } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
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

type MeterNavItem = {
  readonly guid: string;
  readonly label: string;
};

type MeterChildrenState = {
  readonly facilityGuid?: string;
  readonly collapsed: boolean;
  readonly expanded: boolean;
};

const ACCOUNT_DATA_ITEMS: ReadonlyArray<DataNavItem> = [
  { id: 'portfolio', label: 'Portfolio', icon: 'fa-layer-group' }
];

const ACCOUNT_CUSTOM_DATA_ITEMS: ReadonlyArray<DataNavItem> = [
  { id: 'custom-grid-factors', label: 'Grid Factors', icon: 'fa-table-list' },
  { id: 'custom-fuels', label: 'Fuels', icon: 'fa-fire-flame-simple' },
  { id: 'custom-gwps', label: 'Global Warming Potentials', icon: 'fa-earth-americas' }
];

const FACILITY_DATA_ITEMS: ReadonlyArray<DataNavItem> = [
  { id: 'meters', label: 'Meters', icon: 'fa-gauge-high' },
  { id: 'predictors', label: 'Predictors', icon: 'fa-chart-line' },
  { id: 'energy-uses', label: 'Energy Uses', icon: 'fa-screwdriver-wrench' }
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
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly meterChildrenState = signal<MeterChildrenState>({
    collapsed: false,
    expanded: false
  });

  readonly isSingleSiteWorkspace = this.navigation.isSingleSiteWorkspace;
  readonly hasSingleSiteRecovery = this.navigation.hasSingleSiteRecovery;
  readonly dataItems = computed(() => ACCOUNT_DATA_ITEMS);
  readonly accountCustomDataItems = computed(() => {
    const account = this.navigation.account();
    return account?.displayEmissions
      ? ACCOUNT_CUSTOM_DATA_ITEMS
      : ACCOUNT_CUSTOM_DATA_ITEMS.filter(item => item.id === 'custom-fuels');
  });
  readonly facilityDataItems = computed(() => FACILITY_DATA_ITEMS);
  readonly facilityMeterItems = computed(() => {
    return [...this.workspace.facilityMeters()]
      .map(meter => ({
        guid: meter.guid,
        label: meter.name || 'Untitled meter'
      }))
      .sort((first, second) => first.label.localeCompare(second.label));
  });
  readonly isFacilityMetersRoute = computed(() =>
    this.navigation.contextMode() === 'facility'
    && this.navigation.activeSection() === 'data'
    && this.navigation.activeDetail() === 'meters'
  );
  readonly isMeterChildrenOpen = computed(() => {
    const facilityGuid = this.navigation.facility()?.guid;
    const state = this.meterChildrenState();
    const stateApplies = !!facilityGuid && state.facilityGuid === facilityGuid;
    if (this.facilityMeterItems().length === 0) {
      return false;
    }
    if (this.isFacilityMetersRoute()) {
      return !stateApplies || !state.collapsed;
    }
    return stateApplies && state.expanded;
  });
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
  readonly dataTitle = computed(() => {
    return this.navigation.contextMode() === 'facility' ? 'Facility Data' : 'Account Data';
  });
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

  isFacilityDataItemActive(item: DataNavItem): boolean {
    if (item.id !== 'meters') {
      return this.navigation.activeDetail() === item.id;
    }
    return this.isFacilityMetersRoute() && !this.navigation.activeMeterGuid();
  }

  isMeterChildActive(meterGuid: string): boolean {
    return this.navigation.activeMeterGuid() === meterGuid;
  }

  meterChildrenId(): string {
    return `v1-meter-nav-items-${this.navigation.facility()?.guid || 'none'}`;
  }

  toggleMeterChildren(): void {
    const facilityGuid = this.navigation.facility()?.guid;
    if (!facilityGuid || this.facilityMeterItems().length === 0) {
      return;
    }
    const isOpen = this.isMeterChildrenOpen();
    this.meterChildrenState.set({
      facilityGuid,
      collapsed: this.isFacilityMetersRoute() ? isOpen : false,
      expanded: this.isFacilityMetersRoute() ? false : !isOpen
    });
  }
}
