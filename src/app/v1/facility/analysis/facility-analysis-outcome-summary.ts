import { AnalysisCategory, AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from '@data/models/analysis';
import { IdbFacility } from '@data/models/idbModels/facility';

export interface FacilityAnalysisImprovementFact {
  readonly periodLabel: string;
  readonly value?: number;
  readonly unavailableMessage?: string;
}

export interface FacilityAnalysisOutcomeSummary {
  readonly annual: FacilityAnalysisImprovementFact;
  readonly monthly: FacilityAnalysisImprovementFact;
}

export type FacilityAnalysisOutcomeState =
  | { readonly state: 'loading'; readonly message: string }
  | { readonly state: 'blocked'; readonly message: string }
  | { readonly state: 'error'; readonly message: string }
  | { readonly state: 'ready'; readonly summary: FacilityAnalysisOutcomeSummary };

export interface FacilityAnalysisOutcomeDisplayFact {
  readonly label: string;
  readonly valueLabel: string;
  readonly metaLabel: string;
  readonly loading: boolean;
  readonly unavailable: boolean;
}

export interface FacilityAnalysisOutcomeDisplay {
  readonly annual: FacilityAnalysisOutcomeDisplayFact;
  readonly monthly: FacilityAnalysisOutcomeDisplayFact;
}

export function facilityAnalysisOutcomeDisplay(
  state: FacilityAnalysisOutcomeState,
  category: AnalysisCategory
): FacilityAnalysisOutcomeDisplay {
  return {
    annual: displayFact(
      state,
      'annual',
      'Latest full year',
      `Total ${category === 'water' ? 'consumption' : 'energy'} improvement`
    ),
    monthly: displayFact(state, 'monthly', 'Latest month', 'Rolling 12-month improvement')
  };
}

export function facilityAnalysisOutcomeSummary(
  annualRows: readonly AnnualAnalysisSummary[],
  monthlyRows: readonly MonthlyAnalysisSummaryData[],
  reportYear: number | undefined,
  facility: Pick<IdbFacility, 'fiscalYear'> | undefined
): FacilityAnalysisOutcomeSummary {
  const latestAnnualYear = reportYear ?? latestFinite(annualRows.map(row => row.year));
  const annualRow = latestAnnualYear === undefined
    ? undefined
    : annualRows.find(row => row.year === latestAnnualYear);
  const latestMonthlyRow = [...monthlyRows]
    .filter(row => Number.isFinite(new Date(row.date).getTime()))
    .sort((first, second) => new Date(second.date).getTime() - new Date(first.date).getTime())[0];

  return {
    annual: annualRow
      ? improvementFact(
        facility?.fiscalYear === 'calendarYear' ? String(annualRow.year) : `FY ${annualRow.year}`,
        annualRow.totalSavingsPercentImprovement,
        annualRow.missingPredictorValue
      )
      : { periodLabel: 'Latest full year', unavailableMessage: 'No complete year' },
    monthly: latestMonthlyRow
      ? improvementFact(
        new Date(latestMonthlyRow.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        latestMonthlyRow.rolling12MonthImprovement,
        latestMonthlyRow.missingValueWarning
      )
      : { periodLabel: 'Latest month', unavailableMessage: 'No complete month' }
  };
}

function improvementFact(
  periodLabel: string,
  value: number,
  incomplete: boolean
): FacilityAnalysisImprovementFact {
  if (incomplete) return { periodLabel, unavailableMessage: 'Incomplete data' };
  return Number.isFinite(value)
    ? { periodLabel, value }
    : { periodLabel, unavailableMessage: 'Unavailable' };
}

function latestFinite(values: readonly number[]): number | undefined {
  const finiteValues = values.filter(Number.isFinite);
  return finiteValues.length ? Math.max(...finiteValues) : undefined;
}

function displayFact(
  state: FacilityAnalysisOutcomeState,
  period: 'annual' | 'monthly',
  label: string,
  metaLabel: string
): FacilityAnalysisOutcomeDisplayFact {
  if (state.state !== 'ready') {
    return {
      label,
      valueLabel: state.message,
      metaLabel,
      loading: false,
      unavailable: state.state !== 'loading'
    };
  }
  const fact = state.summary[period];
  return {
    label: fact.periodLabel === label ? label : `${label} · ${fact.periodLabel}`,
    valueLabel: fact.value === undefined
      ? fact.unavailableMessage || 'Unavailable'
      : `${fact.value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`,
    metaLabel,
    loading: false,
    unavailable: fact.value === undefined
  };
}
