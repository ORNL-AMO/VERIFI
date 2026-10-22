import { AnalysisCategory, AnnualAnalysisSummary } from '@data/models/analysis';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { accountReportReferencesAnalysis, IdbAccountReport } from '@data/models/idbModels/accountReport';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbFacility } from '@data/models/idbModels/facility';
import { StatusEvaluationState, StatusItem } from '@app/v1/status/status.models';
import { buildFacilitySelectionItems } from '../account-analysis-workbench/select-facility-items/account-analysis-facility-selection.models';
import {
  FacilityAnalysisOutcomeDisplay,
  FacilityAnalysisOutcomeState,
  FacilityAnalysisOutcomeSummary
} from '@app/v1/shared/analysis-results/analysis-outcome-summary';

export type AccountAnalysisCardStatus = 'evaluating' | 'ready' | 'warning' | 'error';
export type AccountAnalysisSelectionState = 'included' | 'skipped' | 'missing' | 'invalid';
export type AccountAnalysisSort = 'attention' | 'modified' | 'name' | 'baseline';

export interface AccountAnalysisFacilitySelectionView {
  readonly facility?: IdbFacility;
  readonly facilityGuid: string;
  readonly facilityName: string;
  readonly analysis?: IdbAnalysisItem;
  readonly analysisName: string;
  readonly state: AccountAnalysisSelectionState;
  readonly detail: string;
}

export interface AccountAnalysisSelectionCounts {
  readonly included: number;
  readonly skipped: number;
  readonly missing: number;
  readonly invalid: number;
}

export interface AccountAnalysisCard {
  readonly analysis: IdbAccountAnalysisItem;
  readonly category: AnalysisCategory;
  readonly status: AccountAnalysisCardStatus;
  readonly statusLabel: string;
  readonly findings: readonly StatusItem[];
  readonly isActiveForReporting: boolean;
  readonly linkedReports: readonly IdbAccountReport[];
  readonly facilitySelections: readonly AccountAnalysisFacilitySelectionView[];
  readonly selectionCounts: AccountAnalysisSelectionCounts;
  readonly selectionProgress: { readonly valid: number; readonly total: number };
  readonly basisLabel: string;
  readonly unitLabel: string;
  readonly modifiedDateLabel: string;
  readonly modifiedSortValue: number;
  readonly searchText: string;
  readonly attentionRank: number;
}

export type AccountAnalysisDashboardResultState =
  | Exclude<FacilityAnalysisOutcomeState, { readonly state: 'ready' }>
  | {
      readonly state: 'ready';
      readonly summary: FacilityAnalysisOutcomeSummary;
      readonly annualAnalysisSummaries: readonly AnnualAnalysisSummary[];
      readonly reportYear?: number;
    };

export interface AccountAnalysisDashboardCard extends AccountAnalysisCard {
  readonly outcome: AccountAnalysisDashboardResultState;
  readonly outcomeDisplay: FacilityAnalysisOutcomeDisplay;
}

export interface BuildAccountAnalysisCardsInput {
  readonly account?: IdbAccount;
  readonly analyses: readonly IdbAccountAnalysisItem[];
  readonly facilities: readonly IdbFacility[];
  readonly facilityAnalyses: readonly IdbAnalysisItem[];
  readonly reports: readonly IdbAccountReport[];
  readonly statusItems: readonly StatusItem[];
  readonly statusState: StatusEvaluationState;
}

export interface AccountAnalysisCardFilters {
  readonly search: string;
  readonly category: 'all' | AnalysisCategory;
  readonly status: 'all' | 'ready' | 'warning' | 'error' | 'active';
  readonly sort: AccountAnalysisSort;
}

export function buildAccountAnalysisCards(input: BuildAccountAnalysisCardsInput): AccountAnalysisCard[] {
  return input.analyses.map(analysis => {
    const findings = input.statusItems.filter(item =>
      item.entity.kind === 'account-analysis' && item.entity.guid === analysis.guid
    );
    const facilitySelections = buildAccountAnalysisFacilitySelections(
      analysis, input.facilities, input.facilityAnalyses
    );
    const selectionCounts = countAccountAnalysisSelections(facilitySelections);
    const selectionItems = buildFacilitySelectionItems(analysis, input.facilities, input.facilityAnalyses, input.statusItems, input.statusState);
    const selectionProgress = { valid: selectionItems.filter(item => item.assigned && item.state !== 'error').length, total: selectionItems.length };
    const status = resolveStatus(input.statusState, findings, selectionCounts);
    const linkedReports = input.reports.filter(report => accountReportReferencesAnalysis(report, analysis.guid));
    const isActiveForReporting = analysis.analysisCategory === 'water'
      ? input.account?.selectedWaterAnalysisId === analysis.guid
      : input.account?.selectedEnergyAnalysisId === analysis.guid;
    const statusLabel = status === 'evaluating'
      ? 'Evaluating'
      : status === 'ready' ? 'Ready' : status === 'warning' ? 'Warning' : 'Error';
    const basisLabel = analysis.analysisCategory === 'water'
      ? 'Water'
      : analysis.energyIsSource ? 'Source energy' : 'Site energy';
    const unitLabel = analysis.analysisCategory === 'water' ? analysis.waterUnit : analysis.energyUnit;
    const modifiedSortValue = safeDateValue(analysis.modifiedDate);
    const searchText = [
      analysis.name,
      analysis.analysisCategory,
      analysis.baselineYear,
      basisLabel,
      unitLabel,
      statusLabel,
      isActiveForReporting ? 'active reporting' : '',
      ...facilitySelections.flatMap(selection => [
        selection.facilityName, selection.analysisName, selection.state, selection.detail
      ]),
      ...linkedReports.map(report => report.name)
    ].join(' ').toLocaleLowerCase();

    return {
      analysis,
      category: analysis.analysisCategory,
      status,
      statusLabel,
      findings,
      isActiveForReporting,
      linkedReports,
      facilitySelections,
      selectionCounts,
      selectionProgress,
      basisLabel,
      unitLabel,
      modifiedDateLabel: formatDate(analysis.modifiedDate),
      modifiedSortValue,
      searchText,
      attentionRank: status === 'error' ? 0 : status === 'warning' ? 1 : status === 'evaluating' ? 2 : 3
    };
  }).sort((first, second) => first.analysis.name.localeCompare(second.analysis.name));
}

export function buildAccountAnalysisFacilitySelections(
  analysis: IdbAccountAnalysisItem,
  facilities: readonly IdbFacility[],
  facilityAnalyses: readonly IdbAnalysisItem[]
): AccountAnalysisFacilitySelectionView[] {
  const linksByFacility = new Map((analysis.facilityAnalysisItems ?? []).map(link => [link.facilityId, link]));
  const facilityByGuid = new Map(facilities.map(facility => [facility.guid, facility]));
  const orderedGuids = [
    ...facilities.map(facility => facility.guid),
    ...(analysis.facilityAnalysisItems ?? [])
      .map(link => link.facilityId)
      .filter(guid => !facilityByGuid.has(guid))
  ];
  return orderedGuids.map(facilityGuid => {
    const facility = facilityByGuid.get(facilityGuid);
    const link = linksByFacility.get(facilityGuid);
    const selectedGuid = link?.analysisItemId;
    const selected = selectedGuid && selectedGuid !== 'skip'
      ? facilityAnalyses.find(item => item.guid === selectedGuid)
      : undefined;
    if (!facility) {
      return selectionView(facilityGuid, undefined, selected, 'invalid', 'Facility no longer exists');
    }
    if (selectedGuid === 'skip') {
      return selectionView(facilityGuid, facility, undefined, 'skipped', 'Explicitly skipped');
    }
    if (!selectedGuid) {
      return selectionView(facilityGuid, facility, undefined, 'missing', 'No analysis selected');
    }
    if (!selected) {
      return selectionView(facilityGuid, facility, undefined, 'missing', 'Selected analysis could not be found');
    }
    if (selected.facilityId !== facilityGuid || selected.analysisCategory !== analysis.analysisCategory) {
      return selectionView(facilityGuid, facility, selected, 'invalid', 'Selection does not match this facility and category');
    }
    return selectionView(facilityGuid, facility, selected, 'included', 'Included in account results');
  });
}

export function filterAndSortAccountAnalysisCards<T extends AccountAnalysisCard>(
  cards: readonly T[],
  filters: AccountAnalysisCardFilters
): T[] {
  const search = filters.search.trim().toLocaleLowerCase();
  return cards.filter(card =>
    (!search || card.searchText.includes(search))
    && (filters.category === 'all' || card.category === filters.category)
    && (filters.status === 'all'
      || (filters.status === 'active' ? card.isActiveForReporting : card.status === filters.status))
  ).sort((first, second) => {
    if (filters.sort === 'modified') return second.modifiedSortValue - first.modifiedSortValue;
    if (filters.sort === 'name') return first.analysis.name.localeCompare(second.analysis.name);
    if (filters.sort === 'baseline') {
      return (first.analysis.baselineYear ?? Infinity) - (second.analysis.baselineYear ?? Infinity)
        || first.analysis.name.localeCompare(second.analysis.name);
    }
    return first.attentionRank - second.attentionRank
      || Number(second.isActiveForReporting) - Number(first.isActiveForReporting)
      || first.analysis.name.localeCompare(second.analysis.name);
  });
}

function selectionView(
  facilityGuid: string,
  facility: IdbFacility | undefined,
  analysis: IdbAnalysisItem | undefined,
  state: AccountAnalysisSelectionState,
  detail: string
): AccountAnalysisFacilitySelectionView {
  return {
    facility,
    facilityGuid,
    facilityName: facility?.name || 'Missing facility',
    analysis,
    analysisName: analysis?.name || (state === 'skipped' ? 'Skipped' : 'Not selected'),
    state,
    detail
  };
}

export function countAccountAnalysisSelections(selections: readonly AccountAnalysisFacilitySelectionView[]): AccountAnalysisSelectionCounts {
  return selections.reduce((counts, selection) => ({
    ...counts,
    [selection.state]: counts[selection.state] + 1
  }), { included: 0, skipped: 0, missing: 0, invalid: 0 });
}

function resolveStatus(
  state: StatusEvaluationState,
  findings: readonly StatusItem[],
  selections: AccountAnalysisSelectionCounts
): AccountAnalysisCardStatus {
  if (state !== 'ready') return state === 'error' ? 'error' : 'evaluating';
  if (findings.some(item => item.severity === 'error') || selections.missing > 0 || selections.invalid > 0) return 'error';
  if (findings.some(item => item.severity === 'warning')) return 'warning';
  return 'ready';
}

function safeDateValue(value: Date): number {
  const timestamp = value ? new Date(value).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function formatDate(value: Date): string {
  const timestamp = safeDateValue(value);
  return timestamp
    ? new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Unknown';
}

/** Shared dashboard/workbench wording for facility selection facts. */
export function accountAnalysisSelectionSummary(counts: AccountAnalysisSelectionCounts): string {
  const exceptions = counts.skipped + counts.missing + counts.invalid;
  return `${counts.included} included${exceptions ? ` · ${exceptions} need attention` : ''}`;
}
