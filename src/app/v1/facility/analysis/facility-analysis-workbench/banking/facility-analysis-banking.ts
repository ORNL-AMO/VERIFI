import { AnalysisGroup, AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { StatusItem } from '@app/v1/status/status.models';
import { getBankedAnalysisGroup, isBankedGroupConfigurationComplete } from '@shared/shared-analysis/banking-configuration';

export type BankingSourceValidation = 'available' | 'warning' | 'unavailable';

export interface BankingSourceOption {
  readonly analysis: IdbAnalysisItem;
  readonly validation: BankingSourceValidation;
  readonly blockingReason?: string;
  readonly warnings: readonly string[];
  readonly usableGroups: readonly AnalysisGroup[];
}

export interface BankedSavingsPreviewRow {
  readonly summary: AnnualAnalysisSummary;
  readonly totalSavingsPercentImprovement: number | undefined;
  readonly transition: boolean;
  readonly modelPeriod: boolean;
}

export function bankingSourceOptions(
  current: IdbAnalysisItem,
  candidates: readonly IdbAnalysisItem[],
  findings: readonly StatusItem[]
): readonly BankingSourceOption[] {
  return candidates
    .filter(candidate => candidate.guid !== current.guid
      && candidate.facilityId === current.facilityId
      && candidate.analysisCategory === current.analysisCategory
      && (current.analysisCategory === 'water' || candidate.energyIsSource === current.energyIsSource))
    .map(candidate => {
      const candidateFindings = findings.filter(finding => finding.entity.guid === candidate.guid
        || finding.entity.guid.startsWith(`${candidate.guid}:`));
      const errors = candidateFindings.filter(finding => finding.severity === 'error');
      const warnings = candidateFindings.filter(finding => finding.severity === 'warning').map(finding => finding.title);
      const cycle = bankingDependencyIncludes(candidate, current.guid, candidates);
      const usableGroups = candidate.groups.filter(group => !isSkippedGroup(group));
      const reason = cycle
        ? 'Selecting this analysis would create a circular banking dependency.'
        : errors.length
          ? errors.map(error => error.title).join(' ')
          : usableGroups.length === 0
            ? 'This analysis has no usable groups.'
            : undefined;
      return {
        analysis: candidate,
        validation: reason ? 'unavailable' : warnings.length ? 'warning' : 'available',
        blockingReason: reason,
        warnings,
        usableGroups
      } satisfies BankingSourceOption;
    })
    .sort((first, second) => second.analysis.baselineYear - first.analysis.baselineYear
      || first.analysis.name.localeCompare(second.analysis.name));
}

export function bankingDependencyIncludes(
  source: IdbAnalysisItem,
  targetGuid: string,
  analyses: readonly IdbAnalysisItem[]
): boolean {
  const byGuid = new Map(analyses.map(analysis => [analysis.guid, analysis]));
  const visited = new Set<string>();
  let cursor: IdbAnalysisItem | undefined = source;
  while (cursor?.hasBanking && cursor.bankedAnalysisItemId) {
    if (cursor.bankedAnalysisItemId === targetGuid) return true;
    if (visited.has(cursor.guid)) return true;
    visited.add(cursor.guid);
    cursor = byGuid.get(cursor.bankedAnalysisItemId);
  }
  return false;
}

export function selectedBankingSource(
  analysis: IdbAnalysisItem | undefined,
  analyses: readonly IdbAnalysisItem[]
): IdbAnalysisItem | undefined {
  return analysis?.bankedAnalysisItemId
    ? analyses.find(item => item.guid === analysis.bankedAnalysisItemId)
    : undefined;
}

export function usableBankedGroup(
  analysis: IdbAnalysisItem | undefined,
  group: AnalysisGroup | undefined,
  analyses: readonly IdbAnalysisItem[]
): AnalysisGroup | undefined {
  const source = selectedBankingSource(analysis, analyses);
  const sourceGroup = getBankedAnalysisGroup(analysis, group, source);
  return sourceGroup && !isSkippedGroup(sourceGroup) ? sourceGroup : undefined;
}

export function bankingTabAvailable(
  analysis: IdbAnalysisItem | undefined,
  group: AnalysisGroup | undefined,
  analyses: readonly IdbAnalysisItem[],
  findings: readonly StatusItem[]
): boolean {
  const source = selectedBankingSource(analysis, analyses);
  if (!isBankedGroupConfigurationComplete(analysis, group, source) || !source) return false;
  return !bankingSourceHasBlockingErrors(analysis, source, findings);
}

export function bankingSourceHasBlockingErrors(
  analysis: IdbAnalysisItem | undefined,
  source: IdbAnalysisItem | undefined,
  findings: readonly StatusItem[]
): boolean {
  if (!analysis || !source) return true;
  return findings.some(finding => finding.severity === 'error' && (
    finding.entity.guid === source.guid
    || finding.entity.guid.startsWith(`${source.guid}:`)
    || (finding.entity.guid === analysis.guid && hasEvidenceReason(finding.evidence['reasons'], 'bankingError'))
  ));
}

export function bankingYearOptions(
  sourceBaselineYear: number | undefined,
  analysisBaselineYear: number | undefined,
  latestCompleteYear: number | undefined
): { readonly appliedYears: readonly number[]; readonly newBaselineYears: readonly number[] } {
  return {
    appliedYears: yearRange(sourceBaselineYear ? sourceBaselineYear + 1 : undefined, latestCompleteYear),
    newBaselineYears: yearRange(analysisBaselineYear, latestCompleteYear)
  };
}

export function bankingPreviewReportYear(group: AnalysisGroup | undefined): number | undefined {
  return typeof group?.newBaselineYear === 'number' && Number.isFinite(group.newBaselineYear)
    ? group.newBaselineYear - 1
    : undefined;
}

export function bankedSavingsPreviewRows(
  rows: readonly AnnualAnalysisSummary[],
  appliedYear: number,
  newBaselineYear: number,
  sourceGroup: AnalysisGroup
): readonly BankedSavingsPreviewRow[] {
  const applied = rows.find(row => row.year === appliedYear);
  return rows.filter(row => row.year < newBaselineYear).map(row => ({
    summary: row,
    transition: row.year > appliedYear,
    modelPeriod: sourceGroup.analysisType === 'regression' && (sourceGroup.isGeneratedModel
      ? row.year === sourceGroup.regressionModelYear
      : row.year >= sourceGroup.regressionStartYear && row.year <= sourceGroup.regressionEndYear),
    totalSavingsPercentImprovement: row.year > appliedYear
      ? applied?.totalSavingsPercentImprovement
      : row.totalSavingsPercentImprovement
  }));
}

export function bankedSavingsChartMonthlyRows(
  rows: readonly MonthlyAnalysisSummaryData[],
  appliedYear: number,
  newBaselineYear: number
): readonly MonthlyAnalysisSummaryData[] {
  const appliedPeriod = rows
    .filter(row => row.fiscalYear <= appliedYear)
    .reduce<MonthlyAnalysisSummaryData | undefined>((latest, row) => {
      return !latest || new Date(row.date).getTime() > new Date(latest.date).getTime() ? row : latest;
    }, undefined);
  return rows
    .filter(row => row.fiscalYear < newBaselineYear)
    .map(row => {
      const transition = row.fiscalYear > appliedYear;
      return {
        ...row,
        isBanked: true,
        isIntermediateBanked: transition,
        percentSavingsComparedToBaseline: transition && appliedPeriod
          ? appliedPeriod.percentSavingsComparedToBaseline
          : row.percentSavingsComparedToBaseline
      };
    });
}

export type AnalysisResultMarker = 'banked-source' | 'banked-savings' | 'transition' | 'model';

export function annualResultMarkers(row: AnnualAnalysisSummary, group?: AnalysisGroup): readonly AnalysisResultMarker[] {
  return resultMarkers(row, group, row.year, undefined);
}

export function monthlyResultMarkers(row: MonthlyAnalysisSummaryData, group?: AnalysisGroup): readonly AnalysisResultMarker[] {
  return resultMarkers(row, group, row.fiscalYear, row.date);
}

export function isTransitionRow(row: Pick<AnnualAnalysisSummary | MonthlyAnalysisSummaryData, 'isIntermediateBanked'>): boolean {
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

function yearRange(start: number | undefined, end: number | undefined): readonly number[] {
  if (!start || !end || start > end) return [];
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function isSkippedGroup(group: AnalysisGroup): boolean {
  return group.analysisType === 'skip' || group.analysisType === 'skipAnalysis';
}

function hasEvidenceReason(value: unknown, reason: string): boolean {
  return Array.isArray(value) && value.includes(reason);
}
