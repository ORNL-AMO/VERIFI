import { AnnualAnalysisSummary } from '@data/models/analysis';
import { MeterResultsChartMetric, MeterResultsChartRow } from '@app/v1/shared/charts/metric-results-chart.models';
import { AccountAnalysisDashboardCard, AccountAnalysisFacilitySelectionView } from '../account-analysis.models';

export interface AccountAnalysisComparisonField {
  readonly id: string;
  readonly label: string;
  readonly firstValue: string;
  readonly secondValue: string;
  readonly different: boolean;
}

export interface AccountAnalysisSelectionComparison {
  readonly facilityGuid: string;
  readonly facilityName: string;
  readonly firstValue: string;
  readonly secondValue: string;
  readonly different: boolean;
}

export interface AccountAnalysisAnnualRow {
  readonly year: number;
  readonly yearLabel: string;
  readonly first?: AnnualAnalysisSummary;
  readonly second?: AnnualAnalysisSummary;
}

export interface AccountAnalysisComparisonView {
  readonly first: AccountAnalysisDashboardCard;
  readonly second: AccountAnalysisDashboardCard;
  readonly fields: readonly AccountAnalysisComparisonField[];
  readonly selections: readonly AccountAnalysisSelectionComparison[];
  readonly annualRows: readonly AccountAnalysisAnnualRow[];
  readonly useChartCompatible: boolean;
  readonly useChartUnavailableMessage?: string;
  readonly useChartRows: readonly MeterResultsChartRow[];
  readonly useChartMetrics: readonly MeterResultsChartMetric[];
  readonly improvementChartRows: readonly MeterResultsChartRow[];
  readonly improvementChartMetrics: readonly MeterResultsChartMetric[];
  readonly firstResultMessage?: string;
  readonly secondResultMessage?: string;
  readonly bothResultsReady: boolean;
}

export function buildAccountAnalysisComparisonView(
  first: AccountAnalysisDashboardCard,
  second: AccountAnalysisDashboardCard,
  fiscalYear: string | undefined
): AccountAnalysisComparisonView {
  const firstRows = readyRows(first);
  const secondRows = readyRows(second);
  const annualRows = alignAnnualRows(firstRows, secondRows, fiscalYear);
  const useChartCompatible = first.category === second.category
    && first.unitLabel === second.unitLabel
    && first.basisLabel === second.basisLabel;
  return {
    first,
    second,
    fields: [
      field('status', 'Status', first.statusLabel, second.statusLabel),
      field('baseline', 'Baseline year', yearLabel(first.analysis.baselineYear), yearLabel(second.analysis.baselineYear)),
      field('category', 'Category', categoryLabel(first), categoryLabel(second)),
      field('unit', 'Unit', first.unitLabel || 'Not set', second.unitLabel || 'Not set'),
      field('basis', 'Basis', first.basisLabel, second.basisLabel)
    ],
    selections: compareSelections(first.facilitySelections, second.facilitySelections),
    annualRows,
    useChartCompatible,
    useChartUnavailableMessage: useChartCompatible
      ? undefined
      : 'Actual and adjusted results require matching units and site/source basis. Percentage improvement remains comparable below.',
    useChartRows: chartRows(annualRows, 'use'),
    useChartMetrics: useMetrics(first, second),
    improvementChartRows: chartRows(annualRows, 'improvement'),
    improvementChartMetrics: improvementMetrics(first, second),
    firstResultMessage: resultMessage(first),
    secondResultMessage: resultMessage(second),
    bothResultsReady: first.outcome.state === 'ready' && second.outcome.state === 'ready'
  };
}

export function compareSelections(
  first: readonly AccountAnalysisFacilitySelectionView[],
  second: readonly AccountAnalysisFacilitySelectionView[]
): AccountAnalysisSelectionComparison[] {
  const firstByFacility = new Map(first.map(selection => [selection.facilityGuid, selection]));
  const secondByFacility = new Map(second.map(selection => [selection.facilityGuid, selection]));
  const guids = [...new Set([...firstByFacility.keys(), ...secondByFacility.keys()])];
  return guids.map(facilityGuid => {
    const firstSelection = firstByFacility.get(facilityGuid);
    const secondSelection = secondByFacility.get(facilityGuid);
    const firstValue = selectionLabel(firstSelection);
    const secondValue = selectionLabel(secondSelection);
    return {
      facilityGuid,
      facilityName: firstSelection?.facilityName || secondSelection?.facilityName || 'Missing facility',
      firstValue,
      secondValue,
      different: selectionKey(firstSelection) !== selectionKey(secondSelection)
    };
  });
}

export function alignAnnualRows(
  firstRows: readonly AnnualAnalysisSummary[],
  secondRows: readonly AnnualAnalysisSummary[],
  fiscalYear: string | undefined
): AccountAnalysisAnnualRow[] {
  const firstByYear = new Map(firstRows.map(row => [row.year, row]));
  const secondByYear = new Map(secondRows.map(row => [row.year, row]));
  return [...new Set([...firstByYear.keys(), ...secondByYear.keys()])]
    .filter(Number.isFinite)
    .sort((first, second) => first - second)
    .map(year => ({
      year,
      yearLabel: fiscalYear === 'calendarYear' ? String(year) : `FY ${year}`,
      first: firstByYear.get(year),
      second: secondByYear.get(year)
    }));
}

function readyRows(card: AccountAnalysisDashboardCard): readonly AnnualAnalysisSummary[] {
  return card.outcome.state === 'ready' ? card.outcome.annualAnalysisSummaries : [];
}

function field(id: string, label: string, firstValue: string, secondValue: string): AccountAnalysisComparisonField {
  return { id, label, firstValue, secondValue, different: firstValue !== secondValue };
}

function selectionLabel(selection: AccountAnalysisFacilitySelectionView | undefined): string {
  if (!selection) return 'Not selected';
  if (selection.state === 'included') return selection.analysisName;
  if (selection.state === 'skipped') return 'Skipped';
  if (selection.state === 'invalid') return `${selection.analysisName} (invalid)`;
  return selection.analysis ? `${selection.analysisName} (missing)` : selection.detail;
}

function selectionKey(selection: AccountAnalysisFacilitySelectionView | undefined): string {
  return `${selection?.state ?? 'missing'}:${selection?.analysis?.guid ?? ''}`;
}

function chartRows(rows: readonly AccountAnalysisAnnualRow[], kind: 'use' | 'improvement'): MeterResultsChartRow[] {
  return rows.map(row => ({
    periodKey: String(row.year),
    periodLabel: row.yearLabel,
    sortValue: row.year,
    values: kind === 'use' ? {
      firstActual: value(row.first, 'energyUse'),
      firstAdjusted: value(row.first, 'adjusted'),
      secondActual: value(row.second, 'energyUse'),
      secondAdjusted: value(row.second, 'adjusted')
    } : {
      firstAnnual: value(row.first, 'annualSavingsPercentImprovement'),
      firstTotal: value(row.first, 'totalSavingsPercentImprovement'),
      secondAnnual: value(row.second, 'annualSavingsPercentImprovement'),
      secondTotal: value(row.second, 'totalSavingsPercentImprovement')
    }
  }));
}

function useMetrics(first: AccountAnalysisDashboardCard, second: AccountAnalysisDashboardCard): MeterResultsChartMetric[] {
  return [
    { id: 'firstActual', label: `${first.analysis.name} actual`, unit: first.unitLabel, color: 'var(--v1-chart-series-1)' },
    { id: 'firstAdjusted', label: `${first.analysis.name} adjusted`, unit: first.unitLabel, color: 'var(--v1-chart-series-2)' },
    { id: 'secondActual', label: `${second.analysis.name} actual`, unit: second.unitLabel, color: 'var(--v1-chart-series-3)' },
    { id: 'secondAdjusted', label: `${second.analysis.name} adjusted`, unit: second.unitLabel, color: 'var(--v1-chart-series-4)' }
  ];
}

function improvementMetrics(first: AccountAnalysisDashboardCard, second: AccountAnalysisDashboardCard): MeterResultsChartMetric[] {
  return [
    { id: 'firstAnnual', label: `${first.analysis.name} annual improvement`, unit: '%', color: 'var(--v1-chart-series-1)' },
    { id: 'firstTotal', label: `${first.analysis.name} total improvement`, unit: '%', color: 'var(--v1-chart-series-2)' },
    { id: 'secondAnnual', label: `${second.analysis.name} annual improvement`, unit: '%', color: 'var(--v1-chart-series-3)' },
    { id: 'secondTotal', label: `${second.analysis.name} total improvement`, unit: '%', color: 'var(--v1-chart-series-4)' }
  ];
}

function value(row: AnnualAnalysisSummary | undefined, key: keyof AnnualAnalysisSummary): number | null {
  if (!row || row.missingPredictorValue) return null;
  const candidate = row[key];
  return typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : null;
}

function resultMessage(card: AccountAnalysisDashboardCard): string | undefined {
  if (card.outcome.state === 'ready') {
    if (!card.outcome.annualAnalysisSummaries.length) return 'No complete annual results';
    if (card.outcome.annualAnalysisSummaries.some(row => row.missingPredictorValue)) return 'Some annual results have incomplete data';
    return undefined;
  }
  return card.outcome.message;
}

function categoryLabel(card: AccountAnalysisDashboardCard): string {
  return card.category === 'water' ? 'Water' : 'Energy';
}

function yearLabel(year: number | undefined): string {
  return Number.isFinite(year) ? String(year) : 'Not set';
}
