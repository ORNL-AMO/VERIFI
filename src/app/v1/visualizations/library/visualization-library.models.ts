import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { inspectVisualizationReferences } from '@data/account-workspace/visualization-reference-inspection';
import { IdbSavedVisualization } from '@data/models/idbModels/savedVisualization';
import { readSavedVisualization } from '@data/visualizations/saved-visualization-record';
import { VisualizationDefinition, VisualizationSourceKind } from '@domain/visualizations/visualization-definition';
import { decodeVisualizationDefinition } from '@domain/visualizations/visualization-validation';
import { visualizationReferences } from '@domain/visualizations/visualization-references';
import { InventoryTile } from '@app/v1/shared/inventory/inventory.models';
import { VISUALIZATION_FAMILIES } from '../visualization-families';

export { VISUALIZATION_FAMILIES } from '../visualization-families';
export type VisualizationLibraryStatus = 'setup-required' | 'repair-required' | 'unsupported' | 'configured';
export interface VisualizationLibraryFilters {
  readonly search: string;
  readonly scope: 'all' | 'portfolio' | 'facility';
  readonly family: 'all' | VisualizationSourceKind;
  readonly status: 'all' | VisualizationLibraryStatus;
  readonly sort: 'modified' | 'name' | 'attention';
}
export const DEFAULT_VISUALIZATION_FILTERS: VisualizationLibraryFilters = {
  search: '', scope: 'all', family: 'all', status: 'all', sort: 'modified'
};
export interface VisualizationLibraryEntry {
  readonly record: Readonly<IdbSavedVisualization>;
  readonly definition?: VisualizationDefinition;
  readonly name: string;
  readonly scope: 'portfolio' | 'facility';
  readonly facilityGuid?: string;
  readonly ownerName: string;
  readonly familyLabel: string;
  readonly families: readonly VisualizationSourceKind[];
  readonly status: VisualizationLibraryStatus;
  readonly statusLabel: string;
  readonly periodLabel: string;
  readonly chartLabel: string;
  readonly modified: number;
  readonly issues: readonly string[];
  readonly searchText: string;
  readonly editable: boolean;
}
const STATUS_LABELS: Record<VisualizationLibraryStatus, string> = {
  'setup-required': 'Setup required', 'repair-required': 'Sources need review', unsupported: 'Read-only · unavailable format', configured: 'Configured · preview support pending'
};
export function buildVisualizationLibrary(snapshot: AccountWorkspaceSnapshot): VisualizationLibraryEntry[] {
  const sourceRecords = [...snapshot.facilities, ...snapshot.meters, ...snapshot.meterGroups, ...snapshot.predictors,
    ...snapshot.energyUseGroups, ...snapshot.energyUseEquipment, ...snapshot.facilityAnalyses, ...snapshot.accountAnalyses];
  return snapshot.savedVisualizations.filter(record => record.accountId === snapshot.account.guid).map(record => {
    const read = readSavedVisualization(record);
    const supported = 'definition' in read;
    const display = supported ? read : decodeVisualizationDefinition(record.definition);
    const definition = 'definition' in display ? display.definition : undefined;
    // Preserved payload labels are safe to display, but their unverified GUIDs must not resolve against destination records.
    const references = supported ? inspectVisualizationReferences(read.definition, snapshot, record.preservation?.references) : record.preservation?.references ?? [];
    const status: VisualizationLibraryStatus = read.state === 'repair-required' || references.length ? 'repair-required'
      : read.state === 'invalid' || read.state === 'unsupported' ? 'unsupported'
      : read.state === 'setup-required' ? 'setup-required' : 'configured';
    const name = definition?.name || 'Unavailable visualization';
    const ownerName = record.facilityId ? snapshot.facilities.find(item => item.guid === record.facilityId)?.name || 'Unavailable facility' : snapshot.account.name || 'Account';
    const families = [...new Set(definition?.sources.map(source => source.kind) ?? [])];
    const familyLabel = families.map(kind => VISUALIZATION_FAMILIES.find(option => option.value === kind)?.label).join(', ') || 'Unknown source family';
    const issues = [...read.issues.map(issue => issue.message), ...references.map(reference => `${reference.kind} ${reference.guid}: ${reference.reason}`)];
    const labels = definition && supported ? visualizationReferences(definition).map(reference => sourceRecords.find(item => item.guid === reference.guid)?.name || reference.guid) : [];
    const periodLabel = definition ? visualizationPeriodLabel(definition) : 'Period unavailable';
    const chartLabel = definition?.chart ? definition.chart.kind.replace(/-/g, ' ') : 'Chart not selected';
    const modified = new Date(record.modifiedDate).getTime();
    return { record, definition, name, scope: record.facilityId ? 'facility' as const : 'portfolio' as const,
      facilityGuid: record.facilityId, ownerName, families, familyLabel, status, statusLabel: STATUS_LABELS[status], periodLabel, chartLabel,
      modified: Number.isFinite(modified) ? modified : 0, issues, editable: supported,
      searchText: [name, ownerName, familyLabel, periodLabel, chartLabel, STATUS_LABELS[status], ...labels].join(' ').toLocaleLowerCase() };
  });
}
export function visualizationPeriodLabel(definition: VisualizationDefinition): string {
  const period = definition.period;
  switch (period.kind) {
    case 'all-history': return 'All saved history';
    case 'fixed': return `${period.start} – ${period.end} (${period.basis})`;
    case 'rolling': return `Rolling ${period.count} ${period.unit}${period.count === 1 ? '' : 's'} · ${period.anchor}`;
    case 'latest-saved-year': return 'Latest saved fiscal year';
    case 'fiscal-year': return `Fiscal year ${period.year}`;
  }
}
export function filterVisualizationLibrary(entries: readonly VisualizationLibraryEntry[], filters: VisualizationLibraryFilters): VisualizationLibraryEntry[] {
  const search = filters.search.trim().toLocaleLowerCase();
  return entries.filter(entry => (!search || entry.searchText.includes(search)) && (filters.scope === 'all' || entry.scope === filters.scope)
    && (filters.family === 'all' || entry.families.includes(filters.family)) && (filters.status === 'all' || entry.status === filters.status))
    .sort((left, right) => {
      if (filters.sort === 'attention') {
        const priority: Record<VisualizationLibraryStatus, number> = { 'repair-required': 0, unsupported: 1, 'setup-required': 2, configured: 3 };
        const difference = priority[left.status] - priority[right.status];
        if (difference) return difference;
      }
      return (filters.sort === 'name' ? left.name.localeCompare(right.name) : right.modified - left.modified)
        || left.name.localeCompare(right.name) || left.record.guid.localeCompare(right.record.guid);
    });
}
export function visualizationLibraryTile(entry: VisualizationLibraryEntry, route: readonly string[], libraryRoute: readonly string[]): InventoryTile {
  return { guid: entry.record.guid, name: entry.name, icon: 'dataVisualization', route,
    owner: entry.facilityGuid ? { facilityGuid: entry.facilityGuid, label: entry.ownerName, route: libraryRoute, queryParams: { facility: entry.facilityGuid } } : undefined,
    location: entry.scope === 'portfolio' ? `${entry.ownerName} · Portfolio` : entry.ownerName,
    chip: entry.familyLabel, simpleChip: entry.familyLabel,
    status: { tone: entry.status === 'repair-required' ? 'danger' : entry.status === 'configured' ? 'neutral' : 'warning',
      icon: entry.status === 'configured' ? 'dataVisualization' : 'warning', label: entry.statusLabel },
    visualizationSnapshot: { typeLabel: entry.familyLabel, scopeLabel: entry.scope === 'portfolio' ? 'Portfolio' : `Facility: ${entry.ownerName}`,
      periodLabel: entry.periodLabel, chartLabel: entry.chartLabel,
      modified: entry.modified ? new Date(entry.modified).toLocaleDateString() : 'Date unavailable', issues: entry.issues }
  };
}
