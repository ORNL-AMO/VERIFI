import { Component, computed, inject, signal } from '@angular/core';
import type { IconName } from '@app/v1/shared/icons/icon-registry';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { meterSourceIcon } from '../../facility/data/meters/facility-meters.models';
import { WorkspaceNavigationService } from '../workspace-navigation.service';

type SettingsNavItem = {
  readonly id: string;
  readonly label: string;
  readonly icon: IconName;
  readonly tone?: 'danger';
};

type DataNavItem = {
  readonly id: string;
  readonly label: string;
  readonly icon: IconName;
};

type MeterNavItem = {
  readonly guid: string;
  readonly label: string;
  readonly icon: IconName;
};

type MeterGroupNavItem = {
  readonly guid: string;
  readonly label: string;
  readonly icon: IconName;
};

type ChildLinksState = {
  readonly facilityGuid?: string;
  readonly collapsed: boolean;
};

const ACCOUNT_DATA_ITEMS: ReadonlyArray<DataNavItem> = [
  { id: 'portfolio', label: 'Portfolio', icon: 'portfolio' }
];

const ACCOUNT_CUSTOM_DATA_ITEMS: ReadonlyArray<DataNavItem> = [
  { id: 'custom-grid-factors', label: 'Grid Factors', icon: 'table' },
  { id: 'custom-fuels', label: 'Fuels', icon: 'fuel' },
  { id: 'custom-gwps', label: 'Global Warming Potentials', icon: 'earth' }
];

const FACILITY_DATA_ITEMS: ReadonlyArray<DataNavItem> = [
  { id: 'meters', label: 'Meters', icon: 'meter' },
  { id: 'meter-grouping', label: 'Meter Grouping', icon: 'meterGroup' },
  { id: 'predictors', label: 'Predictors', icon: 'chartLine' },
  { id: 'energy-uses', label: 'Energy Uses', icon: 'tools' }
];

const ACCOUNT_SETTINGS_ITEMS: ReadonlyArray<SettingsNavItem> = [
  { id: 'profile', label: 'Profile', icon: 'account' },
  { id: 'units', label: 'Units', icon: 'ruler' },
  { id: 'goals', label: 'Goals', icon: 'target' },
  { id: 'financial', label: 'Financial', icon: 'calendar' },
  { id: 'staleness', label: 'Staleness', icon: 'clock' },
  { id: 'backup', label: 'Backup', icon: 'fileDownload' },
  { id: 'portfolio', label: 'Portfolio', icon: 'portfolio' },
  { id: 'delete', label: 'Delete account', icon: 'delete', tone: 'danger' }
];

const FACILITY_SETTINGS_ITEMS: ReadonlyArray<SettingsNavItem> = [
  { id: 'profile', label: 'Profile', icon: 'facility' },
  { id: 'units', label: 'Units', icon: 'ruler' },
  { id: 'goals', label: 'Goals', icon: 'target' },
  { id: 'financial', label: 'Financial', icon: 'calendar' },
  { id: 'staleness', label: 'Staleness', icon: 'clock' },
  { id: 'backup', label: 'Backup', icon: 'fileDownload' }
];

const PORTFOLIO_TRANSITION_ITEM: SettingsNavItem = { id: 'portfolio', label: 'Portfolio', icon: 'portfolio' };

@Component({
  selector: 'app-section-nav',
  templateUrl: './section-nav.component.html',
  styleUrls: ['./section-nav.component.css'],
  standalone: false
})
export class SectionNavComponent {
  readonly navigation = inject(WorkspaceNavigationService);
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly meterChildrenState = signal<ChildLinksState>({
    collapsed: false
  });
  private readonly groupChildrenState = signal<ChildLinksState>({
    collapsed: false
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
  readonly facilityMeterItems = computed<ReadonlyArray<MeterNavItem>>(() => {
    return [...this.workspace.facilityMeters()]
      .map(meter => ({
        guid: meter.guid,
        label: meter.name || 'Untitled meter',
        icon: meterSourceIcon(meter.source)
      }))
      .sort((first, second) => first.label.localeCompare(second.label));
  });
  readonly facilityMeterGroupItems = computed<ReadonlyArray<MeterGroupNavItem>>(() => {
    return [...this.workspace.facilityMeterGroups()]
      .map(group => ({
        guid: group.guid,
        label: group.name || 'Untitled group',
        icon: 'meterGroupItem' as const
      }))
      .sort((first, second) => first.label.localeCompare(second.label));
  });
  readonly isFacilityMetersRoute = computed(() =>
    this.navigation.contextMode() === 'facility'
    && this.navigation.activeSection() === 'data'
    && this.navigation.activeDetail() === 'meters'
  );
  readonly isFacilityMeterGroupingRoute = computed(() =>
    this.navigation.contextMode() === 'facility'
    && this.navigation.activeSection() === 'data'
    && this.navigation.activeDetail() === 'meter-grouping'
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
    return false;
  });
  readonly isGroupChildrenOpen = computed(() => {
    const facilityGuid = this.navigation.facility()?.guid;
    const state = this.groupChildrenState();
    const stateApplies = !!facilityGuid && state.facilityGuid === facilityGuid;
    if (this.facilityMeterGroupItems().length === 0) {
      return false;
    }
    if (this.isFacilityMeterGroupingRoute()) {
      return !stateApplies || !state.collapsed;
    }
    return false;
  });
  readonly settingsItems = computed<ReadonlyArray<SettingsNavItem>>(() => {
    if (this.navigation.contextMode() !== 'facility') {
      return ACCOUNT_SETTINGS_ITEMS;
    }
    const account = this.navigation.account();
    const isSingleFacilityAccount = !!account?.isSingleFacilityCompany;
    const deleteLabel = isSingleFacilityAccount ? 'Delete account' : 'Delete facility';
    const facilityItems = isSingleFacilityAccount
      ? [...FACILITY_SETTINGS_ITEMS, PORTFOLIO_TRANSITION_ITEM]
      : FACILITY_SETTINGS_ITEMS;
    const deleteItem: SettingsNavItem = {
      id: 'delete',
      label: deleteLabel,
      icon: 'delete',
      tone: 'danger'
    };
    return [
      ...facilityItems,
      deleteItem
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
    if (item.id === 'meter-grouping') {
      return this.isFacilityMeterGroupingRoute() && !this.navigation.activeMeterGroupGuid();
    }
    if (item.id !== 'meters') {
      return this.navigation.activeDetail() === item.id;
    }
    return this.isFacilityMetersRoute() && !this.navigation.activeMeterGuid();
  }

  isMeterChildActive(meterGuid: string): boolean {
    return this.navigation.activeMeterGuid() === meterGuid;
  }

  isGroupChildActive(groupGuid: string): boolean {
    return this.navigation.activeMeterGroupGuid() === groupGuid;
  }

  meterChildrenId(): string {
    return `v1-meter-nav-items-${this.navigation.facility()?.guid || 'none'}`;
  }

  groupChildrenId(): string {
    return `v1-meter-group-nav-items-${this.navigation.facility()?.guid || 'none'}`;
  }

  toggleMeterChildren(): void {
    const facilityGuid = this.navigation.facility()?.guid;
    if (!facilityGuid || this.facilityMeterItems().length === 0 || !this.isFacilityMetersRoute()) {
      return;
    }
    const isOpen = this.isMeterChildrenOpen();
    this.meterChildrenState.set({
      facilityGuid,
      collapsed: isOpen
    });
  }

  toggleGroupChildren(): void {
    const facilityGuid = this.navigation.facility()?.guid;
    if (!facilityGuid || this.facilityMeterGroupItems().length === 0 || !this.isFacilityMeterGroupingRoute()) {
      return;
    }
    const isOpen = this.isGroupChildrenOpen();
    this.groupChildrenState.set({
      facilityGuid,
      collapsed: isOpen
    });
  }
}
