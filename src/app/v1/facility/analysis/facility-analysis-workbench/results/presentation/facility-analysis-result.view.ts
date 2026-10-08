import { AnalysisGroup, AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from '@data/models/analysis';
import {
  MeterResultsChartComparisonBand,
  MeterResultsChartMetric,
  MeterResultsChartRow
} from '@app/v1/facility/data/meters/models';
import { isSkippedAnalysisType } from '../../facility-analysis-workbench.models';

export const MONTHLY_USE_COMPARISON_BAND: MeterResultsChartComparisonBand = {
  referenceMetricId: 'actual',
  comparisonMetricId: 'calculated',
  comparisonAboveColor: 'var(--v1-success)',
  referenceAboveColor: 'var(--v1-danger)'
};

export interface MonthlySavingsChartView {
  readonly metrics: readonly MeterResultsChartMetric[];
  readonly rows: readonly MeterResultsChartRow[];
}

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

export interface FacilityGroupContributionGroup {
  readonly groupId: string;
  readonly groupName: string;
}

export interface FacilityGroupContributionsView {
  readonly groups: readonly FacilityGroupContributionGroup[];
  readonly years: readonly FacilityGroupContributionYear[];
}

export function annualImprovementChartMetrics(
  category: 'energy' | 'water' | undefined
): readonly MeterResultsChartMetric[] {
  return category === 'water'
    ? [
      { id: 'annualImprovement', label: 'Annual Consumption Improvement', unit: '%' },
      { id: 'totalImprovement', label: 'Total Consumption Improvement', unit: '%' }
    ]
    : [
      { id: 'annualImprovement', label: 'Annual Energy Improvement', unit: '%' },
      { id: 'totalImprovement', label: 'Total Energy Improvement', unit: '%' }
    ];
}

export function annualUseChartMetrics(
  category: 'energy' | 'water' | undefined,
  unit: string | undefined
): readonly MeterResultsChartMetric[] {
  return category === 'water'
    ? [
      { id: 'actual', label: 'Actual Water Consumption', unit },
      { id: 'calculated', label: 'Calculated Water Consumption', unit }
    ]
    : [
      { id: 'actual', label: 'Actual Energy Use', unit },
      { id: 'calculated', label: 'Calculated Energy Use', unit }
    ];
}

export function annualUseChartRows(rows: readonly AnnualAnalysisSummary[]): readonly MeterResultsChartRow[] {
  return rows.map(row => ({
    periodKey: String(row.year),
    periodLabel: String(row.year),
    sortValue: row.year,
    values: { actual: row.energyUse, calculated: row.isIntermediateBanked ? null : row.adjusted }
  }));
}

export function annualImprovementChartRows(rows: readonly AnnualAnalysisSummary[]): readonly MeterResultsChartRow[] {
  return rows.map(row => ({
    periodKey: String(row.year),
    periodLabel: String(row.year),
    sortValue: row.year,
    values: {
      annualImprovement: row.isIntermediateBanked ? null : row.annualSavingsPercentImprovement,
      totalImprovement: row.totalSavingsPercentImprovement
    }
  }));
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
  const displayedFacilityYears = sortedFacilityYears[0]?.savings === 0
    ? sortedFacilityYears.slice(1)
    : sortedFacilityYears;
  const years = displayedFacilityYears
    .map(facilityYear => ({
      year: facilityYear.year,
      totalSavings: facilityYear.savings,
      totalSavingsPercent: facilityYear.totalSavingsPercentImprovement,
      totalContributionPercent: facilityYear.adjusted === 0
        ? 0
        : (facilityYear.savings / facilityYear.adjusted) * 100,
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

export function monthlyUseChartMetrics(
  category: 'energy' | 'water' | undefined,
  unit: string | undefined
): readonly MeterResultsChartMetric[] {
  return category === 'water'
    ? [
      { id: 'actual', label: 'Actual Water Consumption', unit, color: 'var(--v1-muted)' },
      { id: 'calculated', label: 'Calculated Water Consumption', unit, color: 'var(--v1-chart-series-3)' }
    ]
    : [
      { id: 'actual', label: 'Actual Energy Use', unit, color: 'var(--v1-muted)' },
      { id: 'calculated', label: 'Calculated Energy Use', unit, color: 'var(--v1-chart-series-4)' }
    ];
}

export function monthlyUseChartRows(rows: readonly MonthlyAnalysisSummaryData[]): readonly MeterResultsChartRow[] {
  return rows.map(row => {
    const date = new Date(row.date);
    return {
      periodKey: `${date.getFullYear()}-${date.getMonth()}`,
      periodLabel: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      sortValue: date.getTime(),
      values: { actual: row.energyUse, calculated: row.isIntermediateBanked ? null : row.adjusted }
    };
  });
}

export function monthlySavingsChartView(
  rows: readonly MonthlyAnalysisSummaryData[],
  includeBanking: boolean
): MonthlySavingsChartView {
  const metrics: readonly MeterResultsChartMetric[] = includeBanking
    ? [
      { id: 'bankedSavings', label: 'Banked Savings', unit: '%', color: 'var(--v1-chart-series-3)' },
      { id: 'bankedLosses', label: 'Banked Losses', unit: '%', color: 'var(--v1-danger)' },
      { id: 'savings', label: 'Savings', unit: '%', color: 'var(--v1-success)' },
      { id: 'losses', label: 'Losses', unit: '%', color: 'var(--v1-danger)' }
    ]
    : [
      { id: 'losses', label: 'Losses', unit: '%', color: 'var(--v1-danger)' },
      { id: 'savings', label: 'Savings', unit: '%', color: 'var(--v1-success)' }
    ];
  const transitionCarry = carriedTransitionImprovement(rows);
  return {
    metrics,
    rows: rows.map(row => {
      const date = new Date(row.date);
      const rollingImprovement = row.rolling12MonthImprovement;
      const values: Record<string, number | null> = {
        savings: (!includeBanking || !row.isBanked) && rollingImprovement >= 0 ? rollingImprovement : 0,
        losses: (!includeBanking || !row.isBanked) && rollingImprovement < 0 ? rollingImprovement : 0
      };
      if (includeBanking) {
        const bankedImprovement = row.isIntermediateBanked
          ? transitionCarry.get(row) ?? row.percentSavingsComparedToBaseline
          : rollingImprovement;
        values['bankedSavings'] = row.isBanked && bankedImprovement >= 0 ? bankedImprovement : 0;
        values['bankedLosses'] = row.isBanked && bankedImprovement < 0 ? bankedImprovement : 0;
      }
      return {
        periodKey: `${date.getFullYear()}-${date.getMonth()}`,
        periodLabel: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        sortValue: date.getTime(),
        values
      };
    })
  };
}

function carriedTransitionImprovement(
  rows: readonly MonthlyAnalysisSummaryData[]
): ReadonlyMap<MonthlyAnalysisSummaryData, number> {
  const carry = new Map<MonthlyAnalysisSummaryData, number>();
  let appliedImprovement: number | undefined;
  [...rows]
    .sort((first, second) => new Date(first.date).getTime() - new Date(second.date).getTime())
    .forEach(row => {
      if (row.isBanked && !row.isIntermediateBanked && Number.isFinite(row.percentSavingsComparedToBaseline)) {
        appliedImprovement = row.percentSavingsComparedToBaseline;
      } else if (row.isIntermediateBanked && appliedImprovement !== undefined) {
        carry.set(row, appliedImprovement);
      }
    });
  return carry;
}
