import type { VisualizationPeriod, VisualizationDisplaySettings } from '../visualizations/visualization-definition';

export const HOME_FORMAT_VERSION = 1;
export const HOME_STARTERS = ['home', 'goal-progress', 'energy-use', 'costs', 'emissions', 'water'] as const;
export type HomeTemplate = typeof HOME_STARTERS[number] | 'blank';
export type HomeOwner = { readonly kind: 'account'; readonly guid: string } | { readonly kind: 'facility'; readonly guid: string };
export interface ReportingAnalysisBinding {
  readonly kind: 'reporting';
  readonly owner: HomeOwner;
  readonly category: 'energy' | 'water';
}
export type HomeAnalysisBinding = ReportingAnalysisBinding | { readonly kind: 'exact'; readonly analysisGuid: string };

/** Display intent only. Browsing controls belong to the consuming session, never these records. */
export interface HomeDisplayDefaults {
  readonly period?: VisualizationPeriod;
  readonly displaySettings?: VisualizationDisplaySettings;
  readonly emissionsTreatment?: 'market' | 'location';
}
export type HomeDisplayKey = 'period' | 'units' | 'energyTreatment' | 'emissionsTreatment';
export interface HomeWidgetBase {
  readonly id: string;
  readonly size: 'half' | 'full';
  readonly title?: string;
  readonly visibility: 'always' | 'water' | 'emissions';
}
export type HomeWidget = HomeWidgetBase & (
  | { readonly kind: 'visualization'; readonly visualizationGuid: string;
      readonly inherit: readonly HomeDisplayKey[]; readonly overrides: HomeDisplayDefaults }
  | { readonly kind: 'note'; readonly text: string }
  | { readonly kind: 'shortcut'; readonly destination: { readonly area: 'data' | 'analysis' | 'reports' | 'visualizations' | 'settings';
      readonly owner: HomeOwner; readonly resource?: { readonly kind: 'meter' | 'predictor' | 'equipment' | 'analysis'; readonly guid: string } } }
  | { readonly kind: 'goal'; readonly binding: HomeAnalysisBinding }
  | { readonly kind: 'actions' | 'owner-summary'; readonly settings: { readonly scope: 'owner' } }
  | { readonly kind: 'table'; readonly settings: { readonly view: 'facility-progress' | 'utility-detail' | 'utility-summary' | 'equipment-summary';
      readonly measure: 'energy' | 'cost' | 'emissions' | 'water'; readonly period: 'utility-window' | 'all-years' | 'latest-result' | 'latest-equipment-year' } }
  | { readonly kind: 'map'; readonly settings: { readonly measure: 'energy' | 'cost' | 'emissions' | 'water' } }
);
export interface HomeDashboardDefinition {
  readonly version: typeof HOME_FORMAT_VERSION;
  readonly name: string;
  /** Array order is reading, keyboard and layout order. */
  readonly widgets: readonly HomeWidget[];
  readonly defaults: HomeDisplayDefaults;
  readonly visibility: 'always' | 'water' | 'emissions' | 'hidden';
}
export interface HomeOwnerState {
  readonly version: typeof HOME_FORMAT_VERSION;
  readonly initialized: boolean;
  readonly dashboardOrder: readonly string[];
  readonly defaultDashboardGuid?: string;
  readonly deletedStarters: readonly HomeTemplate[];
}
export interface HomeTemplateProvenance {
  readonly template: HomeTemplate;
  readonly version: number;
  readonly automatic: boolean;
  /** Sticky protection. Only explicit template restore establishes another pristine baseline. */
  readonly customized: boolean;
  readonly baseline: HomeDashboardDefinition;
  readonly chartBaselines: readonly { readonly guid: string; readonly revision: number }[];
}

export function homeOwnerKey(accountGuid: string, owner: HomeOwner): string {
  return JSON.stringify([accountGuid, owner.kind, owner.guid]);
}
export function sameHomeOwner(a: HomeOwner, b: HomeOwner): boolean { return a.kind === b.kind && a.guid === b.guid; }

/** Invalid saved defaults fall back in saved order without changing durable intent during hydration. */
export function resolveHomeDefault(state: HomeOwnerState, visibleDashboardGuids: readonly string[]): string | undefined {
  const visible = new Set(visibleDashboardGuids);
  if (state.defaultDashboardGuid && visible.has(state.defaultDashboardGuid)) return state.defaultDashboardGuid;
  return state.dashboardOrder.find(guid => visible.has(guid)) ?? visibleDashboardGuids[0];
}

/** Presentation policy only: never creates analyses or changes an existing owner identity. */
export function presentedHomeOwner(account: { readonly guid: string; readonly isSingleFacilityCompany?: boolean },
  facilities: readonly { readonly guid: string; readonly accountId: string }[]): HomeOwner | undefined {
  if (!account.isSingleFacilityCompany) return { kind: 'account', guid: account.guid };
  const owned = facilities.filter(item => item.accountId === account.guid);
  return owned.length === 1 ? { kind: 'facility', guid: owned[0].guid } : undefined;
}
