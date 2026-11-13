import type { NavigationMotion } from '@app/v1/shared/navigation/navigation-motion/navigation-motion.directive';
import type { ReportStageId } from '@app/v1/reports/shared/workbench/report-workbench.models';

export type ContextMode = 'account' | 'facility';
export type WorkspaceRouteMotion = NavigationMotion;
export type SectionId = 'home' | 'data' | 'visualization' | 'analysis' | 'reports' | 'settings' | 'imports';
export type FacilityMeterRouteTab = 'settings' | 'readings' | 'bill-inspection' | 'monthly' | 'monthly-chart' | 'yearly' | 'quality';
export type FacilityMeterGroupRouteTab = 'monthly-table' | 'monthly-chart' | 'yearly';
export type FacilityPredictorRouteTab = 'settings' | 'readings' | 'quality';
export type FacilityWeatherPredictorRouteTab = 'setup' | 'readings' | 'quality';
export type FacilityAnalysisRouteTab = 'setup' | 'used-by';
export type FacilityAnalysisGroupRouteTab = 'setup' | 'banking' | 'regression' | 'annual' | 'monthly-table' | 'monthly-chart';
export type FacilityAnalysisResultRouteTab = 'annual' | 'monthly-table' | 'monthly-chart' | 'group-contributions';
export type AccountAnalysisRouteTab = 'setup' | 'select-items' | 'used-by';
export type AccountAnalysisResultRouteTab = 'annual' | 'monthly-table' | 'monthly-chart' | 'facility-details' | 'facility-contributions';
export type AccountAnalysisStageScope = 'setup' | 'select-items' | 'results' | 'used-by';
export type AccountPortfolioTab = 'facilities' | 'meters' | 'predictors' | 'energy-uses';
export type FacilityAnalysisStageScope = 'analysis' | 'group' | 'facility' | 'used-by';

export interface RouteState {
  readonly portfolioTab?: AccountPortfolioTab;
  readonly view: 'welcome' | 'workspace';
  readonly contextMode: ContextMode;
  readonly accountGuid?: string;
  readonly facilityGuid?: string;
  readonly meterGuid?: string;
  readonly meterGroupGuid?: string;
  readonly predictorGuid?: string;
  readonly energyUseGuid?: string;
  readonly energyUseGroupGuid?: string;
  readonly weatherPredictorGroupKey?: string;
  readonly reportGuid?: string;
  readonly visualizationGuid?: string;
  readonly reportStage?: 'setup' | 'data-checks' | 'report';
  readonly analysisGuid?: string;
  readonly analysisGroupGuid?: string;
  readonly analysisStageScope?: FacilityAnalysisStageScope;
  readonly accountAnalysisStageScope?: AccountAnalysisStageScope;
  readonly accountAnalysisResultTab?: AccountAnalysisResultRouteTab;
  readonly importFileId?: string;
  readonly importStep?: string;
  readonly section: SectionId;
  readonly detail: string;
}

export type FacilityScope =
  | { readonly kind: 'all' }
  | { readonly kind: 'facility'; readonly facilityGuid: string };

export const ALL_FACILITIES: FacilityScope = { kind: 'all' };

export function facilityScopeQuery(scope: FacilityScope): { facility?: string } {
  return scope.kind === 'facility' ? { facility: scope.facilityGuid } : {};
}

const VALID_SECTION_IDS: ReadonlyArray<SectionId> = ['home', 'data', 'visualization', 'analysis', 'reports', 'settings', 'imports'];
const DEFAULT_DETAILS: Record<SectionId, string> = {
  home: 'overview',
  data: 'portfolio',
  visualization: 'dashboard',
  analysis: 'dashboard',
  reports: 'dashboard',
  settings: 'profile',
  imports: 'upload'
};
const DEFAULT_FACILITY_DETAILS: Record<SectionId, string> = {
  ...DEFAULT_DETAILS,
  data: 'meters'
};

export function isAccountInventory(state: RouteState): boolean {
  return state.contextMode === 'account' && ((state.section === 'data' && state.detail === 'portfolio')
    || ((state.section === 'analysis' || state.section === 'reports') && state.detail === 'dashboard')
    || (state.section === 'visualization' && state.detail === 'dashboard'));
}

export function visualizationDashboardRoute(accountGuid: string): string[] {
  return ['/v1', 'workspace', 'account', accountGuid, 'visualization', 'dashboard'];
}

export function visualizationWorkbenchRoute(accountGuid: string, visualizationGuid: string): string[] {
  return ['/v1', 'workspace', 'account', accountGuid, 'visualization', 'workbench', visualizationGuid];
}

export function accountRoute(accountGuid: string): Array<string> {
  return ['/v1', 'workspace', 'account', accountGuid, 'home', 'overview'];
}

export function accountSettingsRoute(accountGuid: string, detail = 'profile'): Array<string> {
  return ['/v1', 'workspace', 'account', accountGuid, 'settings', detail];
}

export function accountDataRoute(accountGuid: string, detail = 'portfolio'): Array<string> {
  return ['/v1', 'workspace', 'account', accountGuid, 'data', detail];
}

export function accountPortfolioRoute(accountGuid: string, tab: AccountPortfolioTab = 'facilities'): Array<string> {
  return ['/v1', 'workspace', 'account', accountGuid, 'data', 'portfolio', tab];
}

export function accountImportsRoute(accountGuid: string): Array<string> {
  return ['/v1', 'workspace', 'account', accountGuid, 'imports', 'upload'];
}

export function accountReportsRoute(accountGuid: string): Array<string> {
  return ['/v1', 'workspace', 'account', accountGuid, 'reports', 'dashboard'];
}

export function accountReportWorkbenchRoute(accountGuid: string, reportGuid: string, stage: ReportStageId = 'setup'): Array<string> {
  return ['/v1', 'workspace', 'account', accountGuid, 'reports', 'workbench', reportGuid, stage];
}

export function facilityReportWorkbenchRoute(facilityGuid: string, reportGuid: string, stage: 'setup' | 'data-checks' | 'report' = 'setup'): Array<string> {
  return ['/v1', 'workspace', 'facility', facilityGuid, 'reports', 'workbench', reportGuid, stage];
}

export function accountAnalysisRoute(accountGuid: string): Array<string> {
  return ['/v1', 'workspace', 'account', accountGuid, 'analysis', 'dashboard'];
}

export function accountAnalysisWorkbenchRoute(
  accountGuid: string,
  analysisGuid: string,
  tab: AccountAnalysisRouteTab = 'setup'
): Array<string> {
  return ['/v1', 'workspace', 'account', accountGuid, 'analysis', 'workbench', analysisGuid, tab];
}

export function accountAnalysisResultsRoute(
  accountGuid: string,
  analysisGuid: string,
  tab: AccountAnalysisResultRouteTab = 'annual'
): Array<string> {
  return ['/v1', 'workspace', 'account', accountGuid, 'analysis', 'workbench', analysisGuid, 'results', tab];
}

export function facilityRoute(facilityGuid: string): Array<string> {
  return ['/v1', 'workspace', 'facility', facilityGuid, 'home', 'overview'];
}

export function facilityDataToolRoute(facilityGuid: string, detail: string): Array<string> {
  return ['/v1', 'workspace', 'facility', facilityGuid, 'data', detail];
}

export function facilityAnalysisWorkbenchRoute(
  facilityGuid: string,
  analysisGuid: string,
  tab: FacilityAnalysisRouteTab = 'setup'
): Array<string> {
  return ['/v1', 'workspace', 'facility', facilityGuid, 'analysis', 'workbench', analysisGuid, tab];
}

export function facilityAnalysisGroupRoute(
  facilityGuid: string,
  analysisGuid: string,
  groupGuid: string,
  tab: FacilityAnalysisGroupRouteTab = 'setup'
): Array<string> {
  return ['/v1', 'workspace', 'facility', facilityGuid, 'analysis', 'workbench', analysisGuid, 'group', groupGuid, tab];
}

export function facilityAnalysisResultsRoute(
  facilityGuid: string,
  analysisGuid: string,
  tab: FacilityAnalysisResultRouteTab = 'annual'
): Array<string> {
  return ['/v1', 'workspace', 'facility', facilityGuid, 'analysis', 'workbench', analysisGuid, 'facility', tab];
}

export function facilityMeterRoute(facilityGuid: string, meterGuid: string, tab: FacilityMeterRouteTab = 'settings'): Array<string> {
  return ['/v1', 'workspace', 'facility', facilityGuid, 'data', 'meters', meterGuid, tab];
}

export function facilityMeterGroupRoute(
  facilityGuid: string,
  groupGuid: string,
  tab: FacilityMeterGroupRouteTab = 'monthly-table'
): Array<string> {
  return ['/v1', 'workspace', 'facility', facilityGuid, 'data', 'meter-grouping', groupGuid, tab];
}

export function facilityEnergyUseGroupRoute(facilityGuid: string, groupGuid: string): Array<string> {
  return ['/v1', 'workspace', 'facility', facilityGuid, 'data', 'energy-uses', 'groups', groupGuid];
}

export function facilityEnergyUseRoute(facilityGuid: string, groupGuid: string, energyUseGuid: string): Array<string> {
  return [...facilityEnergyUseGroupRoute(facilityGuid, groupGuid), 'items', energyUseGuid];
}

export function facilityPredictorRoute(
  facilityGuid: string,
  predictorGuid: string,
  tab: FacilityPredictorRouteTab = 'settings'
): Array<string> {
  return ['/v1', 'workspace', 'facility', facilityGuid, 'data', 'predictors', predictorGuid, tab];
}

export function facilityWeatherPredictorCreateRoute(facilityGuid: string): Array<string> {
  return ['/v1', 'workspace', 'facility', facilityGuid, 'data', 'predictors', 'weather', 'new'];
}

export function facilityWeatherPredictorRoute(
  facilityGuid: string,
  groupKey: string,
  tab: FacilityWeatherPredictorRouteTab = 'setup'
): Array<string> {
  return [
    '/v1', 'workspace', 'facility', facilityGuid, 'data', 'predictors',
    'weather', groupKey, tab
  ];
}

export function facilityWeatherPredictorQualityRoute(
  facilityGuid: string,
  groupKey: string,
  predictorGuid: string
): Array<string> {
  return [
    ...facilityWeatherPredictorRoute(facilityGuid, groupKey, 'quality'),
    predictorGuid
  ];
}

export function facilitySettingsRoute(facilityGuid: string, detail = 'profile'): string[] {
  return ['/v1', 'workspace', 'facility', facilityGuid, 'settings', detail];
}

export function legacyFacilityManagementRoute(accountGuid: string | undefined): string[] {
  return accountGuid ? ['/data-management', accountGuid, 'facilities'] : ['/manage-accounts'];
}

export function parseWorkspaceRoute(url: string): RouteState {
  const parts = url.split(/[?#]/, 1)[0].split('/').filter(Boolean);
  const v1Index = parts.indexOf('v1');
  const routeParts = v1Index >= 0 ? parts.slice(v1Index + 1) : parts;
  if (routeParts[0] !== 'workspace') {
    return {
      view: 'welcome',
      contextMode: 'account',
      section: 'home',
      detail: 'overview'
    };
  }
  if (routeParts[1] === 'facility') {
    const section = normalizeSection(routeParts[3]);
    const detail = routeParts[4] || DEFAULT_FACILITY_DETAILS[section];
    const isWeatherPredictorRoute = section === 'data'
      && detail === 'predictors'
      && routeParts[5] === 'weather';
    const isAnalysisWorkbenchRoute = section === 'analysis'
      && detail === 'workbench'
      && !!routeParts[5];
    const analysisRouteSegment = isAnalysisWorkbenchRoute ? routeParts[6] : undefined;
    const analysisStageScope: FacilityAnalysisStageScope | undefined = analysisRouteSegment === 'group'
      ? 'group'
      : analysisRouteSegment === 'facility'
        ? 'facility'
        : analysisRouteSegment === 'used-by'
          ? 'used-by'
          : isAnalysisWorkbenchRoute
            ? 'analysis'
            : undefined;
    return {
      view: 'workspace',
      contextMode: 'facility',
      facilityGuid: routeParts[2],
      section,
      detail,
      visualizationGuid: section === 'visualization' && detail === 'workbench' && routeParts[5] ? safeDecodeRoutePart(routeParts[5]) : undefined,
      reportGuid: section === 'reports' && detail === 'workbench' && routeParts[5] ? safeDecodeRoutePart(routeParts[5]) : undefined,
      reportStage: section === 'reports' && detail === 'workbench' && routeParts[5]
        ? routeParts[6] === 'data-checks' || routeParts[6] === 'report' ? routeParts[6] : 'setup' : undefined,
      meterGuid: section === 'data' && detail === 'meters' && routeParts[5]
        ? safeDecodeRoutePart(routeParts[5])
        : undefined,
      meterGroupGuid: section === 'data' && detail === 'meter-grouping' && routeParts[5]
        ? safeDecodeRoutePart(routeParts[5])
        : undefined,
      energyUseGroupGuid: section === 'data' && detail === 'energy-uses' && routeParts[5] === 'groups' && routeParts[6]
        ? safeDecodeRoutePart(routeParts[6]) : undefined,
      energyUseGuid: section === 'data' && detail === 'energy-uses' && routeParts[5] === 'groups' && routeParts[6] && routeParts[7] === 'items' && routeParts[8]
        ? safeDecodeRoutePart(routeParts[8]) : undefined,
      predictorGuid: section === 'data' && detail === 'predictors' && routeParts[5] && !isWeatherPredictorRoute
        ? safeDecodeRoutePart(routeParts[5])
        : undefined,
      weatherPredictorGroupKey: isWeatherPredictorRoute && routeParts[6] && routeParts[6] !== 'new'
        ? safeDecodeRoutePart(routeParts[6])
        : undefined,
      analysisGuid: section === 'analysis' && detail === 'workbench' && routeParts[5]
        ? safeDecodeRoutePart(routeParts[5])
        : undefined,
      analysisGroupGuid: analysisStageScope === 'group' && routeParts[7]
        ? safeDecodeRoutePart(routeParts[7])
        : undefined,
      analysisStageScope
    };
  }
  const section = normalizeSection(routeParts[3]);
  const isImportFileRoute = section === 'imports' && routeParts[4] === 'file';
  const isAccountAnalysisWorkbenchRoute = section === 'analysis'
    && routeParts[4] === 'workbench'
    && !!routeParts[5];
  const accountAnalysisStageSegment = isAccountAnalysisWorkbenchRoute ? routeParts[6] : undefined;
  const accountAnalysisStageScope: AccountAnalysisStageScope | undefined = accountAnalysisStageSegment === 'select-items'
    ? 'select-items'
    : accountAnalysisStageSegment === 'results'
      ? 'results'
      : accountAnalysisStageSegment === 'used-by'
        ? 'used-by'
        : isAccountAnalysisWorkbenchRoute
          ? 'setup'
          : undefined;
  const accountAnalysisResultTab = accountAnalysisStageScope === 'results'
    && ['annual', 'monthly-table', 'monthly-chart', 'facility-details', 'facility-contributions'].includes(routeParts[7])
      ? routeParts[7] as AccountAnalysisResultRouteTab
      : undefined;
  return {
    view: 'workspace',
    contextMode: 'account',
    accountGuid: routeParts[2],
    portfolioTab: section === 'data' && routeParts[4] === 'portfolio'
      ? (['facilities', 'meters', 'predictors', 'energy-uses'].includes(routeParts[5]) ? routeParts[5] as AccountPortfolioTab : 'facilities')
      : undefined,
    section,
    detail: routeParts[4] || DEFAULT_DETAILS[section],
    visualizationGuid: section === 'visualization' && routeParts[4] === 'workbench' && routeParts[5] ? safeDecodeRoutePart(routeParts[5]) : undefined,
    reportGuid: section === 'reports' && routeParts[4] === 'workbench' && routeParts[5] ? safeDecodeRoutePart(routeParts[5]) : undefined,
    reportStage: section === 'reports' && routeParts[4] === 'workbench' && routeParts[5]
      ? routeParts[6] === 'data-checks' || routeParts[6] === 'report' ? routeParts[6] : 'setup' : undefined,
    analysisGuid: isAccountAnalysisWorkbenchRoute
      ? safeDecodeRoutePart(routeParts[5])
      : undefined,
    accountAnalysisStageScope,
    accountAnalysisResultTab,
    importFileId: isImportFileRoute && routeParts[5]
      ? safeDecodeRoutePart(routeParts[5])
      : undefined,
    importStep: isImportFileRoute && routeParts[6]
      ? safeDecodeRoutePart(routeParts[6])
      : undefined
  };
}

function normalizeSection(section: string | undefined): SectionId {
  return VALID_SECTION_IDS.includes(section as SectionId) ? section as SectionId : 'home';
}

function safeDecodeRoutePart(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
