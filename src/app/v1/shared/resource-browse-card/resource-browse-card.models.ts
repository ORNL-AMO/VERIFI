import type { IconName } from '../icons/icon-registry';

export type ResourceBrowseCardTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface ResourceBrowseCardOwner {
  readonly label: string;
  readonly icon?: IconName;
}

export interface ResourceBrowseCardChip {
  readonly id: string;
  readonly label: string;
  readonly icon?: IconName;
  readonly tone?: ResourceBrowseCardTone;
  readonly accentColor?: string;
  readonly loading?: boolean;
}

export interface ResourceBrowseCardFact {
  readonly id: string;
  readonly label: string;
  readonly valueLabel: string;
  readonly metaLabel?: string;
  readonly changeLabel?: string;
  readonly changeTone?: 'increase' | 'decrease' | 'neutral' | 'unavailable';
  readonly unavailable?: boolean;
  readonly loading?: boolean;
}

export interface ResourceBrowseCardFactSection {
  readonly id: string;
  readonly ariaLabel?: string;
  readonly note?: string;
  readonly facts: ReadonlyArray<ResourceBrowseCardFact>;
  readonly emphasis?: 'primary' | 'secondary';
}

export interface ResourceBrowseCardNote {
  readonly id: string;
  readonly label: string;
  readonly icon?: IconName;
  readonly tone?: ResourceBrowseCardTone;
  readonly loading?: boolean;
}

export interface ResourceBrowseCardFooterTag {
  readonly label: string;
  readonly icon?: IconName;
}

export interface ResourceBrowseCardAction {
  readonly id: string;
  readonly label: string;
  readonly icon: IconName;
  readonly tone?: 'default' | 'danger';
  readonly disabled?: boolean;
  readonly loading?: boolean;
}

export interface ResourceBrowseCardCapabilities {
  readonly canOpen: boolean;
  readonly canAct: boolean;
}

export const DEFAULT_RESOURCE_BROWSE_CARD_CAPABILITIES: ResourceBrowseCardCapabilities = {
  canOpen: true,
  canAct: true
};

export const READ_ONLY_RESOURCE_BROWSE_CARD_CAPABILITIES: ResourceBrowseCardCapabilities = {
  canOpen: true,
  canAct: false
};

export interface ResourceBrowseCardView {
  readonly title: string;
  readonly openLabel: string;
  readonly icon: IconName;
  readonly iconColor?: string;
  readonly statusTone?: ResourceBrowseCardTone;
  readonly owner?: ResourceBrowseCardOwner;
  readonly chips?: ReadonlyArray<ResourceBrowseCardChip>;
  readonly factSections?: ReadonlyArray<ResourceBrowseCardFactSection>;
  readonly notes?: ReadonlyArray<ResourceBrowseCardNote>;
  readonly footerTag?: ResourceBrowseCardFooterTag;
  readonly errorMessage?: string;
  readonly loading?: boolean;
  readonly loadingLabel?: string;
}
