import { Component, computed, inject } from '@angular/core';
import { WorkspaceNavigationService } from '../workspace-navigation.service';

type SettingsNavItem = {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly tone?: 'danger';
};

const ACCOUNT_SETTINGS_ITEMS: ReadonlyArray<SettingsNavItem> = [
  { id: 'profile', label: 'Profile', icon: 'fa-building' },
  { id: 'units', label: 'Units', icon: 'fa-ruler-combined' },
  { id: 'goals', label: 'Goals', icon: 'fa-bullseye' },
  { id: 'financial', label: 'Financial', icon: 'fa-calendar-days' },
  { id: 'staleness', label: 'Staleness', icon: 'fa-clock' },
  { id: 'backup', label: 'Backup', icon: 'fa-file-arrow-down' },
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
  readonly settingsItems = computed(() => {
    if (this.navigation.contextMode() !== 'facility') {
      return ACCOUNT_SETTINGS_ITEMS;
    }
    const deleteLabel = this.navigation.account()?.isSingleFacilityCompany ? 'Delete account' : 'Delete facility';
    return [
      ...FACILITY_SETTINGS_ITEMS,
      { id: 'delete', label: deleteLabel, icon: 'fa-trash', tone: 'danger' as const }
    ];
  });
  readonly settingsTitle = computed(() => {
    if (this.isSingleSiteWorkspace() && this.navigation.contextMode() === 'facility') {
      return 'Site Setup';
    }
    return this.navigation.contextMode() === 'facility' ? 'Facility Settings' : 'Account Settings';
  });
  readonly homeTitle = computed(() => {
    if (this.isSingleSiteWorkspace() && this.navigation.contextMode() === 'facility') {
      return 'Site Home';
    }
    return this.navigation.contextMode() === 'facility' ? 'Facility Home' : 'Account Home';
  });
  readonly recoveryTitle = computed(() =>
    this.navigation.singleSiteWorkspaceState() === 'missing-facility'
      ? 'Single-site setup needs a facility'
      : 'Single-site setup needs one facility'
  );
  readonly recoveryMessage = computed(() =>
    this.navigation.singleSiteWorkspaceState() === 'missing-facility'
      ? 'This account is marked as single-site, but no facility is available yet.'
      : 'This account is marked as single-site, but it has more than one facility.'
  );
}
