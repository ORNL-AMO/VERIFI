import { AnalysisGroup, AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from '@data/models/analysis';
import { IdbFacility } from '@data/models/idbModels/facility';
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
  group?: AnalysisGroup,
  facility?: Pick<IdbFacility, 'fiscalYear' | 'fiscalYearMonth' | 'fiscalYearCalendarEnd'>
): readonly AnalysisResultMarker[] {
  return resultMarkers(row, group, row.year, undefined, facility);
}

export function monthlyResultMarkers(
  row: MonthlyAnalysisSummaryData,
  group?: AnalysisGroup
): readonly AnalysisResultMarker[] {
  return resultMarkers(row, group, row.fiscalYear, row.date, undefined);
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
  date: Date | undefined,
  facility: Pick<IdbFacility, 'fiscalYear' | 'fiscalYearMonth' | 'fiscalYearCalendarEnd'> | undefined
): readonly AnalysisResultMarker[] {
  const markers: AnalysisResultMarker[] = [];
  if (row.isBanked && !row.isIntermediateBanked) markers.push('banked-source');
  if (Number.isFinite(row.savingsBanked) && row.savingsBanked !== 0) markers.push('banked-savings');
  if (row.isIntermediateBanked) markers.push('transition');
  if (group && (date
    ? isMonthlyModelPeriod(group, fiscalYear, date)
    : isAnnualModelPeriod(group, fiscalYear, facility))) markers.push('model');
  return markers;
}

export function isAnnualModelPeriod(
  group: AnalysisGroup,
  fiscalYear: number,
  facility: Pick<IdbFacility, 'fiscalYear' | 'fiscalYearMonth' | 'fiscalYearCalendarEnd'> | undefined
): boolean {
  if (group.analysisType !== 'regression') return false;
  if (group.isGeneratedModel) return fiscalYear === group.regressionModelYear;
  if (!facility || !validUserDefinedModelPeriod(group)) return false;
  const fiscalStartYear = facility.fiscalYear === 'calendarYear' || !facility.fiscalYearCalendarEnd
    ? fiscalYear
    : fiscalYear - 1;
  const fiscalStartMonth = facility.fiscalYear === 'calendarYear' ? 0 : facility.fiscalYearMonth;
  const fiscalStart = fiscalStartYear * 12 + fiscalStartMonth;
  const fiscalEnd = fiscalStart + 11;
  const modelStart = group.regressionStartYear * 12 + group.regressionModelStartMonth;
  const modelEnd = group.regressionEndYear * 12 + group.regressionModelEndMonth;
  return modelStart <= fiscalEnd && modelEnd >= fiscalStart;
}

function isMonthlyModelPeriod(group: AnalysisGroup, fiscalYear: number, date: Date): boolean {
  if (group.analysisType !== 'regression') return false;
  if (group.isGeneratedModel) return fiscalYear === group.regressionModelYear;
  if (!validUserDefinedModelPeriod(group)) return false;
  const period = new Date(date).getFullYear() * 12 + new Date(date).getMonth();
  const start = group.regressionStartYear * 12 + group.regressionModelStartMonth;
  const end = group.regressionEndYear * 12 + group.regressionModelEndMonth;
  return period >= start && period <= end;
}

function validUserDefinedModelPeriod(group: AnalysisGroup): boolean {
  return [group.regressionStartYear, group.regressionModelStartMonth, group.regressionEndYear, group.regressionModelEndMonth]
    .every(Number.isFinite);
}
