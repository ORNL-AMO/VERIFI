import { AnalysisGroup, AnnualAnalysisSummary } from '@data/models/analysis';
import { isSkippedAnalysisType } from '../../facility-analysis-workbench.models';

export {
  MONTHLY_USE_COMPARISON_BAND,
  annualImprovementChartMetrics,
  annualImprovementChartRows,
  annualUseChartMetrics,
  annualUseChartRows,
  monthlySavingsChartView,
  monthlyUseChartMetrics,
  monthlyUseChartRows
} from '@app/v1/shared/analysis-results/chart/analysis-result-chart.view';
export type { MonthlySavingsChartView } from '@app/v1/shared/analysis-results/chart/analysis-result-chart.view';

export interface FacilityGroupContributionSource {
  readonly group: AnalysisGroup;
  readonly annualAnalysisSummaryData: readonly AnnualAnalysisSummary[];
}

export interface FacilityGroupContributionRow {
  readonly groupId: string;
  readonly groupName: string;
  readonly savings: number;
  readonly savingsPercent: number;
  readonly contributionPercent: number;
}

export interface FacilityGroupContributionYear {
  readonly year: number;
  readonly totalSavings: number;
  readonly totalSavingsPercent: number;
  readonly totalContributionPercent: number;
  readonly groups: readonly FacilityGroupContributionRow[];
}

export interface FacilityGroupContributionGroup { readonly groupId: string; readonly groupName: string; }

export interface FacilityGroupContributionsView {
  readonly groups: readonly FacilityGroupContributionGroup[];
  readonly years: readonly FacilityGroupContributionYear[];
}

export function facilityGroupContributionsView(
  facilityAnnual: readonly AnnualAnalysisSummary[],
  groupResults: readonly FacilityGroupContributionSource[],
  groupNames: ReadonlyMap<string, string>
): FacilityGroupContributionsView {
  const includedGroups = groupResults.filter(result => !isSkippedAnalysisType(result.group.analysisType));
  const groups = includedGroups.map(result => ({
    groupId: result.group.idbGroupId,
    groupName: groupNames.get(result.group.idbGroupId) ?? result.group.idbGroupId
  }));
  const sortedFacilityYears = [...facilityAnnual].sort((first, second) => first.year - second.year);
  const displayedFacilityYears = sortedFacilityYears[0]?.savings === 0 ? sortedFacilityYears.slice(1) : sortedFacilityYears;
  const years = displayedFacilityYears.map(facilityYear => ({
    year: facilityYear.year,
    totalSavings: facilityYear.savings,
    totalSavingsPercent: facilityYear.totalSavingsPercentImprovement,
    totalContributionPercent: facilityYear.adjusted === 0 ? 0 : (facilityYear.savings / facilityYear.adjusted) * 100,
    groups: includedGroups.map(result => {
      const groupYear = result.annualAnalysisSummaryData.find(row => row.year === facilityYear.year);
      const savings = groupYear?.savings ?? 0;
      return {
        groupId: result.group.idbGroupId,
        groupName: groupNames.get(result.group.idbGroupId) ?? result.group.idbGroupId,
        savings,
        savingsPercent: groupYear?.totalSavingsPercentImprovement ?? 0,
        contributionPercent: facilityYear.adjusted === 0 ? 0 : (savings / facilityYear.adjusted) * 100
      };
    })
  }));
  return { groups, years };
}
