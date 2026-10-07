import { AnalysisGroup, AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { StatusItem } from '@app/v1/status/status.models';
import {
  bankingDependencyIncludes,
  bankingYearOptions,
  evaluateBankedGroupConfiguration,
  evaluateBankingSource,
  getBankedAnalysisGroup,
  isCompatibleBankingSource
} from '@shared/shared-analysis/banking-configuration';

export { bankingDependencyIncludes, bankingYearOptions } from '@shared/shared-analysis/banking-configuration';

export type BankingSourceValidation = 'available' | 'warning' | 'unavailable';

export interface BankingSourceOption {
  readonly sourceGuid: string;
  readonly displayName: string;
  readonly baselineYear?: number;
  readonly analysis?: IdbAnalysisItem;
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
  const selectedGuid = current.bankedAnalysisItemId;
  const visibleCandidates = candidates.filter(candidate => isCompatibleBankingSource(current, candidate)
    || candidate.guid === selectedGuid);
  const options: BankingSourceOption[] = visibleCandidates
    .map(candidate => {
      const candidateFindings = findings.filter(finding => finding.entity.guid === candidate.guid
        || finding.entity.guid.startsWith(`${candidate.guid}:`));
      const errors = candidateFindings.filter(finding => finding.severity === 'error');
      const warnings = candidateFindings.filter(finding => finding.severity === 'warning').map(finding => finding.title);
      const selection = evaluateBankingSource({
        ...current,
        hasBanking: true,
        bankedAnalysisItemId: candidate.guid
      }, candidates);
      const usableGroups = candidate.groups.filter(group => !isSkippedGroup(group));
      const reason = sourceIssueReason(selection.issue)
        ?? (errors.length
          ? errors.map(error => error.title).join(' ')
          : usableGroups.length === 0
            ? 'This analysis has no usable groups.'
            : undefined);
      return {
        sourceGuid: candidate.guid,
        displayName: candidate.name,
        baselineYear: candidate.baselineYear,
        analysis: candidate,
        validation: reason ? 'unavailable' : warnings.length ? 'warning' : 'available',
        blockingReason: reason,
        warnings,
        usableGroups
      } satisfies BankingSourceOption;
    });
  if (selectedGuid && !candidates.some(candidate => candidate.guid === selectedGuid)) {
    options.push({
      sourceGuid: selectedGuid,
      displayName: 'Previously selected analysis',
      validation: 'unavailable',
      blockingReason: 'The selected banking source no longer exists.',
      warnings: [],
      usableGroups: []
    });
  }
  return options.sort((first, second) => (second.baselineYear ?? -Infinity) - (first.baselineYear ?? -Infinity)
    || first.displayName.localeCompare(second.displayName));
}

export function selectedBankingSource(
  analysis: IdbAnalysisItem | undefined,
  analyses: readonly IdbAnalysisItem[]
): IdbAnalysisItem | undefined {
  const evaluation = evaluateBankingSource(analysis, analyses);
  return evaluation.issue ? undefined : evaluation.source;
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
  findings: readonly StatusItem[],
  latestCompleteYear: number | undefined
): boolean {
  const source = selectedBankingSource(analysis, analyses);
  if (!evaluateBankedGroupConfiguration(analysis, group, analyses, latestCompleteYear).valid || !source) return false;
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

function isSkippedGroup(group: AnalysisGroup): boolean {
  return group.analysisType === 'skip' || group.analysisType === 'skipAnalysis';
}

function sourceIssueReason(issue: ReturnType<typeof evaluateBankingSource>['issue']): string | undefined {
  switch (issue) {
    case 'cycle': return 'Selecting this analysis would create a circular banking dependency.';
    case 'incompatible': return 'This analysis no longer matches the facility, category, or energy basis.';
    case 'dependency-missing': return 'A banking source used by this analysis is no longer available.';
    case 'missing': return 'The selected banking source no longer exists.';
    default: return undefined;
  }
}

function hasEvidenceReason(value: unknown, reason: string): boolean {
  return Array.isArray(value) && value.includes(reason);
}
