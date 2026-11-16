import type { ReportType } from '@data/models/constantsAndTypes';
import type { FacilityReportType } from '@data/models/idbModels/facilityReport';
import type { IconName } from '@app/v1/shared/icons/icon-registry';
import type { ReportScope } from '@app/v1/reports/shared/report.models';

/** Static presentation capabilities only; calculations and durable commands stay with their owners. */
export interface ReportDefinition {
  readonly label: string;
  readonly icon: IconName;
  readonly requiresOtherImpacts: boolean;
  readonly hasDataChecks: boolean;
  readonly contentImplemented: boolean;
  readonly supportsAnalysisReturn: boolean;
}

// Declaration order preserves the established report choices for each scope.
const ACCOUNT_REPORT_CATALOG = {
  betterPlants: { label: 'Better Plants', icon: 'betterPlantsReport', requiresOtherImpacts: false, hasDataChecks: true, contentImplemented: true, supportsAnalysisReturn: true },
  dataOverview: { label: 'Data Overview', icon: 'report', requiresOtherImpacts: false, hasDataChecks: false, contentImplemented: false, supportsAnalysisReturn: false },
  performance: { label: 'Performance', icon: 'report', requiresOtherImpacts: false, hasDataChecks: true, contentImplemented: false, supportsAnalysisReturn: true },
  betterClimate: { label: 'Emissions', icon: 'report', requiresOtherImpacts: true, hasDataChecks: false, contentImplemented: false, supportsAnalysisReturn: false },
  analysis: { label: 'Analysis', icon: 'report', requiresOtherImpacts: false, hasDataChecks: false, contentImplemented: false, supportsAnalysisReturn: true },
  accountEmissionFactors: { label: 'Emission Factors', icon: 'report', requiresOtherImpacts: true, hasDataChecks: false, contentImplemented: false, supportsAnalysisReturn: false },
  accountSavings: { label: 'Savings', icon: 'report', requiresOtherImpacts: false, hasDataChecks: true, contentImplemented: false, supportsAnalysisReturn: true }
} as const satisfies Readonly<Record<ReportType, ReportDefinition>>;

const FACILITY_REPORT_CATALOG = {
  analysis: { label: 'Analysis', icon: 'facilityAnalysisReport', requiresOtherImpacts: false, hasDataChecks: true, contentImplemented: true, supportsAnalysisReturn: true },
  overview: { label: 'Data Overview', icon: 'report', requiresOtherImpacts: false, hasDataChecks: false, contentImplemented: false, supportsAnalysisReturn: false },
  emissionFactors: { label: 'Emission Factors', icon: 'report', requiresOtherImpacts: true, hasDataChecks: false, contentImplemented: false, supportsAnalysisReturn: false },
  savings: { label: 'Savings', icon: 'report', requiresOtherImpacts: false, hasDataChecks: true, contentImplemented: false, supportsAnalysisReturn: false },
  modeling: { label: 'Modeling', icon: 'report', requiresOtherImpacts: false, hasDataChecks: false, contentImplemented: false, supportsAnalysisReturn: false },
  costSavings: { label: 'Cost Savings', icon: 'report', requiresOtherImpacts: false, hasDataChecks: true, contentImplemented: false, supportsAnalysisReturn: false },
  dataQuality: { label: 'Data Quality', icon: 'report', requiresOtherImpacts: false, hasDataChecks: false, contentImplemented: true, supportsAnalysisReturn: true }
} as const satisfies Readonly<Record<FacilityReportType, ReportDefinition>>;

export const ACCOUNT_REPORT_TYPES: ReadonlyArray<{ readonly value: ReportType; readonly label: string }> =
  (Object.keys(ACCOUNT_REPORT_CATALOG) as ReportType[]).map(value => ({ value, label: ACCOUNT_REPORT_CATALOG[value].label }));
export const FACILITY_REPORT_TYPES: ReadonlyArray<{ readonly value: FacilityReportType; readonly label: string }> =
  (Object.keys(FACILITY_REPORT_CATALOG) as FacilityReportType[]).map(value => ({ value, label: FACILITY_REPORT_CATALOG[value].label }));

export function reportDefinition(scope: ReportScope, type: string): ReportDefinition | undefined {
  const catalog: Readonly<Record<string, ReportDefinition>> = scope === 'account' ? ACCOUNT_REPORT_CATALOG : FACILITY_REPORT_CATALOG;
  return Object.hasOwn(catalog, type) ? catalog[type] : undefined;
}

/** Other Impacts is stored as the account's existing displayEmissions preference. */
export function reportTypeAvailable(scope: ReportScope, type: string, displayEmissions: boolean | undefined): boolean {
  return !reportDefinition(scope, type)?.requiresOtherImpacts || displayEmissions === true;
}

export type ReportTypeChoice = (
  | { readonly scope: 'account'; readonly type: ReportType }
  | { readonly scope: 'facility'; readonly type: FacilityReportType }
) & {
  readonly value: string;
  readonly typeLabel: string;
  readonly label: string;
  readonly formatLabel?: string;
};

/** Presentation choices retain the existing scope-qualified inventory type keys. */
export function reportTypeChoices(singleFacility: boolean, displayEmissions?: boolean): readonly ReportTypeChoice[] {
  const types = [
    ...ACCOUNT_REPORT_TYPES.map(option => ({ scope: 'account' as const, type: option.value, typeLabel: option.label })),
    ...FACILITY_REPORT_TYPES.map(option => ({ scope: 'facility' as const, type: option.value, typeLabel: option.label }))
  ].filter(option => reportTypeAvailable(option.scope, option.type, displayEmissions));
  const choices = types.map(option => {
    const formatLabel = singleFacility && types.some(other => other.scope !== option.scope && other.typeLabel === option.typeLabel)
      ? option.scope === 'account' ? 'Account format' : 'Facility format' : undefined;
    return { ...option, value: `${option.scope}:${option.type}`, formatLabel,
      label: singleFacility ? option.typeLabel + (formatLabel ? ` — ${formatLabel}` : '')
        : `${option.scope === 'account' ? 'Account' : 'Facility'} · ${option.typeLabel}` };
  });
  return singleFacility ? choices.sort((a, b) => a.label.localeCompare(b.label)) : choices;
}

export function reportTypePresentation(scope: ReportScope, type: string, singleFacility: boolean): { label: string; formatLabel?: string } {
  const choice = reportTypeChoices(singleFacility, true).find(option => option.value === `${scope}:${type}`);
  return { label: singleFacility ? choice?.label ?? 'Report' : choice?.typeLabel ?? 'Report', formatLabel: choice?.formatLabel };
}
