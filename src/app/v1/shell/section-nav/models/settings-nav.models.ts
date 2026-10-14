import type { IconName } from '@app/v1/shared/icons/icon-registry';
export interface SettingsNavItem { readonly id: string; readonly label: string; readonly icon: IconName; readonly tone?: 'danger'; }
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


export function settingsNavItems(facilityContext: boolean, singleFacility: boolean): readonly SettingsNavItem[] {
  if (!facilityContext) return ACCOUNT_SETTINGS_ITEMS;
  return [
    ...FACILITY_SETTINGS_ITEMS,
    ...(singleFacility ? [PORTFOLIO_TRANSITION_ITEM] : []),
    { id: 'delete', label: singleFacility ? 'Delete account' : 'Delete facility', icon: 'delete', tone: 'danger' }
  ];
}
