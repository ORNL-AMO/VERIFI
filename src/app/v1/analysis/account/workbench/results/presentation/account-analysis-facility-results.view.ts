import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from '@data/models/analysis';
import { AccountAnalysisFacilitySummary } from '@platform/web-workers/account-analysis-results-worker.contract';

export interface AccountFacilityDetailView {
  readonly facilityGuid: string;
  readonly analysisGuid: string;
  readonly facilityName: string;
  readonly monthlyRows: readonly MonthlyAnalysisSummaryData[];
  readonly latestRollingImprovement?: number;
  readonly latestFiscalYear?: number;
  readonly latestFiscalYearSavings?: number;
  readonly latestFiscalYearContributionPercent?: number;
}

export interface AccountFacilityContributionRow {
  readonly facilityGuid: string;
  readonly analysisGuid: string;
  readonly facilityName: string;
  readonly savings: number;
  readonly savingsPercent: number;
  readonly contributionPercent: number;
}

export interface AccountFacilityContributionYear {
  readonly year: number;
  readonly totalSavings: number;
  readonly totalSavingsPercent: number;
  readonly totalContributionPercent: number;
  readonly facilities: readonly AccountFacilityContributionRow[];
}

export interface AccountFacilityContributionsView {
  readonly facilities: readonly Pick<AccountFacilityContributionRow, 'facilityGuid' | 'analysisGuid' | 'facilityName'>[];
  readonly years: readonly AccountFacilityContributionYear[];
}

export function accountFacilityDetailsView(
  summaries: readonly AccountAnalysisFacilitySummary[],
  facilityNames: ReadonlyMap<string, string>,
  annualRows: readonly AnnualAnalysisSummary[] = []
): readonly AccountFacilityDetailView[] {
  const latestAccountYear = [...annualRows].sort((first, second) => first.year - second.year).at(-1);
  const accountAdjusted = numberOrZero(latestAccountYear?.adjusted);
  return summaries.map(summary => {
    const monthlyRows = [...summary.monthlySummaryData].sort((first, second) => dateValue(first.date) - dateValue(second.date));
    const latest = monthlyRows.at(-1);
    const latestFiscalYearSavings = latestAccountYear
      ? sum(monthlyRows.filter(row => row.fiscalYear === latestAccountYear.year), 'savings')
      : undefined;
    return {
      facilityGuid: summary.facilityGuid,
      analysisGuid: summary.analysisGuid,
      facilityName: facilityNames.get(summary.facilityGuid) ?? summary.facilityGuid,
      monthlyRows,
      latestRollingImprovement: latest && finiteValue(latest.rolling12MonthImprovement)
        ? latest.rolling12MonthImprovement
        : undefined,
      latestFiscalYear: latestAccountYear?.year,
      latestFiscalYearSavings,
      latestFiscalYearContributionPercent: latestFiscalYearSavings === undefined
        ? undefined
        : accountAdjusted === 0 ? 0 : (latestFiscalYearSavings / accountAdjusted) * 100
    };
  });
}

export function accountFacilityContributionsView(
  annualRows: readonly AnnualAnalysisSummary[],
  summaries: readonly AccountAnalysisFacilitySummary[],
  facilityNames: ReadonlyMap<string, string>
): AccountFacilityContributionsView {
  const facilities = summaries.map(summary => ({
    facilityGuid: summary.facilityGuid,
    analysisGuid: summary.analysisGuid,
    facilityName: facilityNames.get(summary.facilityGuid) ?? summary.facilityGuid
  }));
  const sortedYears = [...annualRows].sort((first, second) => first.year - second.year);
  const displayedYears = sortedYears[0]?.savings === 0 ? sortedYears.slice(1) : sortedYears;
  const years = displayedYears.map(accountYear => {
    const accountAdjusted = numberOrZero(accountYear.adjusted);
    const totalSavings = numberOrZero(accountYear.savings);
    return {
      year: accountYear.year,
      totalSavings,
      totalSavingsPercent: numberOrZero(accountYear.totalSavingsPercentImprovement),
      totalContributionPercent: accountAdjusted === 0 ? 0 : (totalSavings / accountAdjusted) * 100,
      facilities: facilities.map(facility => {
        const rows = summaries.find(summary => summary.facilityGuid === facility.facilityGuid)?.monthlySummaryData ?? [];
        const yearRows = rows.filter(row => row.fiscalYear === accountYear.year);
        const savings = sum(yearRows, 'savings');
        const adjusted = sum(yearRows, 'adjusted');
        return {
          ...facility,
          savings,
          savingsPercent: adjusted === 0 ? 0 : (savings / adjusted) * 100,
          contributionPercent: accountAdjusted === 0 ? 0 : (savings / accountAdjusted) * 100
        };
      })
    };
  });
  return { facilities, years };
}

function sum(rows: readonly MonthlyAnalysisSummaryData[], key: 'savings' | 'adjusted'): number {
  return rows.reduce((total, row) => total + numberOrZero(row[key]), 0);
}

function finiteValue(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function numberOrZero(value: number | undefined): number {
  return finiteValue(value) ? value : 0;
}

function dateValue(value: Date): number {
  const date = new Date(value).getTime();
  return Number.isFinite(date) ? date : 0;
}
