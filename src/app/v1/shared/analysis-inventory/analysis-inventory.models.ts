import { IdbFacility } from '@data/models/idbModels/facility';
import { InventoryAnalysisSnapshot, InventoryTile } from '@app/v1/shared/inventory/inventory.models';
import { BrowseFilters } from '@app/v1/shared/navigation/browse-state/browse-state.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { analysisOutcomeDisplay, FacilityAnalysisOutcomeDisplay } from '@app/v1/shared/analysis-results/analysis-outcome-summary';
import { FacilityAnalysisCard } from '@app/v1/facility/analysis/facility-analysis-dashboard/facility-analysis.models';
import { buildFacilityAnalysisGroupModelViews } from '@app/v1/facility/analysis/group-model-roster/facility-analysis-group-model.view';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { StatusEvaluationState } from '@app/v1/status/status.models';
import { analysisDependencyMessage } from '@app/v1/shared/analysis-results/analysis-dependency-message';
import { AccountAnalysisCard, AccountAnalysisDashboardResultState } from '@app/v1/account/analysis/account-analysis-dashboard/account-analysis.models';

export type AnalysisInventoryEntry =
  | { readonly scope: 'account'; readonly key: string; readonly ownerName: string; readonly card: AccountAnalysisCard }
  | { readonly scope: 'facility'; readonly key: string; readonly ownerName: string; readonly facility: IdbFacility; readonly card: FacilityAnalysisCard };
export type AnalysisInventoryResultEntry = AnalysisInventoryEntry & {
  readonly outcome: AccountAnalysisDashboardResultState;
  readonly outcomeDisplay: FacilityAnalysisOutcomeDisplay;
};

export function analysisInventoryStatusLabel(status: AccountAnalysisCard['status'], evaluation: StatusEvaluationState): string {
  if (evaluation !== 'ready') return evaluation === 'error' ? 'Checks unavailable' : 'Checks pending';
  return status === 'ready' ? 'All data valid' : status === 'error' ? 'Has errors' : status === 'warning' ? 'Has warnings' : 'Checks pending';
}

export function filterAnalysisInventory(entries: readonly AnalysisInventoryEntry[], filters: BrowseFilters['analyses']): AnalysisInventoryEntry[] {
  const search = filters.search.trim().toLocaleLowerCase();
  return entries.filter(entry =>
    (filters.scope === 'all' || filters.scope === entry.scope)
    && (filters.category === 'all' || filters.category === entry.card.category)
    && (filters.status === 'all' || (filters.status === 'active' ? entry.card.isActiveForReporting : entry.card.status === filters.status))
    && (!search || `${entry.ownerName} ${entry.scope} analysis ${entry.card.statusLabel} ${entry.card.searchText}`.toLocaleLowerCase().includes(search))
  ).sort((a, b) => {
    const first = a.card, second = b.card;
    const scope = filters.sort === 'account-first' ? Number(a.scope === 'facility') - Number(b.scope === 'facility') : 0;
    const primary = filters.sort === 'modified' ? second.modifiedSortValue - first.modifiedSortValue
      : filters.sort === 'baseline' ? (first.analysis.baselineYear ?? Infinity) - (second.analysis.baselineYear ?? Infinity)
      : filters.sort === 'attention' || filters.sort === 'account-first' ? first.attentionRank - second.attentionRank || Number(second.isActiveForReporting) - Number(first.isActiveForReporting) : 0;
    return scope || primary || first.analysis.name.localeCompare(second.analysis.name) || a.ownerName.localeCompare(b.ownerName) || a.key.localeCompare(b.key);
  });
}

export function analysisInventoryTile(entry: AnalysisInventoryEntry, outcome: AccountAnalysisDashboardResultState | undefined,
  meterGroups: readonly IdbUtilityMeterGroup[], navigation: WorkspaceNavigationService, accountGuid: string, evaluation: StatusEvaluationState = 'ready', showCategory = true, showOwner = true): InventoryTile {
  const card = entry.card;
  const analysis = card.analysis;
  const display = analysisOutcomeDisplay(outcome ?? { state: 'loading', message: 'Results not loaded' }, card.category);
  const statusLabel = analysisInventoryStatusLabel(card.status, evaluation);
  const unchecked = evaluation !== 'ready' || card.status === 'evaluating';
  const basis = card.category === 'water' ? 'Water' : analysis.energyIsSource ? 'Source energy' : 'Site energy';
  const roster: InventoryAnalysisSnapshot['roster'] = entry.scope === 'account'
    ? []
    : buildFacilityAnalysisGroupModelViews(entry.card.analysis, meterGroups).map(row => ({
      id: row.id, name: row.name, detail: `${row.methodLabel} · ${row.modelLabel}`,
      state: row.excluded ? 'Excluded' : row.unavailable || (evaluation === 'ready' && card.findings.some(finding =>
        finding.severity === 'error' && finding.entity.kind === 'analysis-group' && finding.entity.guid === `${analysis.guid}:${row.id}`
      )) ? 'Incomplete' : ''
    }));
  return {
    guid: entry.key, name: analysis.name || 'Untitled analysis', icon: entry.scope === 'account' ? 'accountAnalysis' : 'analysis',
    route: entry.scope === 'account' ? navigation.accountAnalysisWorkbenchRoute(accountGuid, analysis.guid) : navigation.facilityAnalysisWorkbenchRoute(entry.facility.guid, analysis.guid),
    owner: showOwner && entry.scope === 'facility' ? { label: entry.ownerName, route: navigation.facilityAnalysisRoute(entry.facility.guid) } : undefined,
    chip: showCategory ? card.category === 'water' ? 'Water' : 'Energy' : undefined,
    chipIcon: showCategory ? card.category === 'water' ? 'droplet' : 'energy' : undefined,
    status: { label: statusLabel, tone: unchecked ? 'neutral' : card.status === 'ready' ? 'success' : card.status === 'error' ? 'danger' : card.status === 'warning' ? 'warning' : 'neutral', icon: unchecked ? statusLabel === 'Checks unavailable' ? 'info' : 'loading' : card.status === 'ready' ? 'success' : 'warning' },
    analysisSnapshot: {
      scope: entry.scope, active: card.isActiveForReporting,
      outcomes: [display.annual, display.monthly].map(fact => ({ label: fact.label, value: fact.valueLabel, description: fact.metaLabel, unavailable: fact.unavailable || !outcome || outcome.state === 'loading' })),
      facts: [{ label: 'Baseline', value: analysis.baselineYear ? String(analysis.baselineYear) : 'Not set' },
        ...(card.category === 'energy' ? [{ label: 'Energy basis', value: basis }] : [])],
      selectionProgress: entry.scope === 'account' ? { ...entry.card.selectionProgress, evaluation } : undefined,
      rosterTitle: 'Group Details', roster,
      usage: analysisDependencyMessage(entry.scope === 'facility' ? entry.card.linkedAccountAnalyses.length : 0,
        card.linkedReports.length, entry.scope === 'facility' ? entry.card.bankingConsumers.length : 0),
      findings: evaluation === 'ready' ? card.findings.flatMap(finding => finding.severity === 'information' ? [] : [{
        id: finding.id, title: finding.title, description: finding.description, severity: finding.severity
      }]).sort((a, b) => Number(a.severity !== 'error') - Number(b.severity !== 'error') || a.title.localeCompare(b.title) || a.id.localeCompare(b.id)) : [],
      modified: card.modifiedDateLabel
    }
  };
}
