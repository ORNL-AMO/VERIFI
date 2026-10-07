import { AnalysisGroup, AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from '@data/models/analysis';
import type { IconName } from '@app/v1/shared/icons/icon-registry';

export type AnalysisResultMarker = 'banked-source' | 'banked-savings' | 'transition' | 'model';

export interface AnalysisResultMarkerDetails {
  readonly id: AnalysisResultMarker;
  readonly icon: IconName;
  readonly label: string;
}

const MARKERS: Readonly<Record<AnalysisResultMarker, AnalysisResultMarkerDetails>> = {
  'banked-source': { id: 'banked-source', icon: 'piggyBank', label: 'Banked source period' },
  'banked-savings': { id: 'banked-savings', icon: 'bank', label: 'Banked savings added' },
  transition: { id: 'transition', icon: 'paintRoller', label: 'Transition period' },
  model: { id: 'model', icon: 'star', label: 'Model period' }
};

const MARKER_ORDER: readonly AnalysisResultMarker[] = [
  'banked-source', 'banked-savings', 'transition', 'model'
];

export function resultMarkerDetails(marker: AnalysisResultMarker): AnalysisResultMarkerDetails {
  return MARKERS[marker];
}

export function orderedUniqueResultMarkers(
  markers: readonly AnalysisResultMarker[]
): readonly AnalysisResultMarker[] {
  const present = new Set(markers);
  return MARKER_ORDER.filter(marker => present.has(marker));
}

export function annualResultMarkers(
  row: AnnualAnalysisSummary,
  group?: AnalysisGroup
): readonly AnalysisResultMarker[] {
  return resultMarkers(row, group, row.year, undefined);
}

export function monthlyResultMarkers(
  row: MonthlyAnalysisSummaryData,
  group?: AnalysisGroup
): readonly AnalysisResultMarker[] {
  return resultMarkers(row, group, row.fiscalYear, row.date);
}

export function isTransitionRow(
  row: Pick<AnnualAnalysisSummary | MonthlyAnalysisSummaryData, 'isIntermediateBanked'>
): boolean {
  return !!row.isIntermediateBanked;
}

function resultMarkers(
  row: Pick<AnnualAnalysisSummary, 'isBanked' | 'isIntermediateBanked' | 'savingsBanked'>,
  group: AnalysisGroup | undefined,
  fiscalYear: number,
  date: Date | undefined
): readonly AnalysisResultMarker[] {
  const markers: AnalysisResultMarker[] = [];
  if (row.isBanked && !row.isIntermediateBanked) markers.push('banked-source');
  if (Number.isFinite(row.savingsBanked) && row.savingsBanked !== 0) markers.push('banked-savings');
  if (row.isIntermediateBanked) markers.push('transition');
  if (group && isModelPeriod(group, fiscalYear, date)) markers.push('model');
  return markers;
}

function isModelPeriod(group: AnalysisGroup, fiscalYear: number, date: Date | undefined): boolean {
  if (group.analysisType !== 'regression') return false;
  if (group.isGeneratedModel) return fiscalYear === group.regressionModelYear;
  if (!date) return fiscalYear >= group.regressionStartYear && fiscalYear <= group.regressionEndYear;
  if (![group.regressionStartYear, group.regressionModelStartMonth, group.regressionEndYear, group.regressionModelEndMonth]
    .every(Number.isFinite)) return false;
  const period = new Date(date).getFullYear() * 12 + new Date(date).getMonth();
  const start = group.regressionStartYear * 12 + group.regressionModelStartMonth;
  const end = group.regressionEndYear * 12 + group.regressionModelEndMonth;
  return period >= start && period <= end;
}
