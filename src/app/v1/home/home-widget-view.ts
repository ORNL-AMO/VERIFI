import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { IdbHomeDashboard } from '@data/models/idbModels/homeDashboard';
import { homeReferences } from '@data/home/home-widget-references';
import { readSavedVisualization } from '@data/visualizations/saved-visualization-record';
import { inspectVisualizationReferences } from '@data/account-workspace/visualization-reference-inspection';
import { HomeOwner, HomeWidget } from '@domain/home/home-dashboard';
import * as routes from '@app/v1/routing/workspace-route';
import { buildHomeChart } from '@domain/home/home-chart-recipes';

export type ShortcutDestination = Extract<HomeWidget, { kind: 'shortcut' }>['destination'];
export interface HomeShortcutChoice {
  readonly key: string;
  readonly label: string;
  readonly destination: ShortcutDestination;
  readonly route: readonly string[];
  readonly queryParams: { readonly facility?: string };
}
export interface HomeWidgetView {
  readonly widget: HomeWidget;
  readonly title: string;
  readonly state: 'ready' | 'deferred' | 'missing-source' | 'repair-required' | 'unsupported' | 'invalid';
  readonly message: string;
  readonly blockedPaths?: readonly string[];
  readonly context?: string;
  readonly shortcut?: HomeShortcutChoice;
}
export const HOME_WIDGET_LABELS: Record<HomeWidget['kind'], string> = { visualization: 'Saved visualization', 'built-in-chart': 'Built-in chart', note: 'Note', shortcut: 'Shortcut', goal: 'Goal summary',
  actions: 'Actions', 'owner-summary': 'Owner summary', table: 'Table', map: 'Map' };
export function shortcutKey(destination: ShortcutDestination): string {
  return JSON.stringify([destination.area, destination.owner.kind, destination.owner.guid, destination.resource?.kind ?? null, destination.resource?.guid ?? null]);
}

/** Only validated typed internal destinations; neither URLs nor remembered selections enter the records. */
export function homeShortcutChoices(snapshot: AccountWorkspaceSnapshot): HomeShortcutChoice[] {
  const account = snapshot.account, facilities = snapshot.facilities.filter(item => item.accountId === account.guid);
  const choices: HomeShortcutChoice[] = [];
  const add = (destination: ShortcutDestination, label: string, route: readonly string[], queryParams: { facility?: string } = {}) =>
    choices.push({ key: shortcutKey(destination), label, destination, route, queryParams });
  const owners: Array<{ owner: HomeOwner; name: string }> = [{ owner: { kind: 'account', guid: account.guid }, name: `${account.name} (Account)` },
    ...facilities.map(facility => ({ owner: { kind: 'facility' as const, guid: facility.guid }, name: `${facility.name} (Facility)` }))];
  for (const { owner, name } of owners) {
    const query = owner.kind === 'facility' && !account.isSingleFacilityCompany ? { facility: owner.guid } : {};
    const links = { data: owner.kind === 'account' ? routes.accountPortfolioRoute(account.guid) : routes.accountPortfolioRoute(account.guid, 'meters'),
      analysis: routes.accountAnalysisRoute(account.guid), reports: routes.accountReportsRoute(account.guid), visualizations: routes.visualizationDashboardRoute(account.guid),
      settings: owner.kind === 'account' ? routes.accountSettingsRoute(account.guid) : routes.facilitySettingsRoute(owner.guid) };
    for (const area of ['data', 'analysis', 'reports', 'visualizations', 'settings'] as const)
      add({ area, owner }, `${name} · ${area[0].toUpperCase()}${area.slice(1)}`, links[area], area === 'settings' ? {} : query);
  }
  for (const facility of facilities) {
    const owner: HomeOwner = { kind: 'facility', guid: facility.guid }, prefix = `${facility.name} · `;
    for (const meter of snapshot.meters.filter(item => item.accountId === account.guid && item.facilityId === facility.guid))
      add({ area: 'data', owner, resource: { kind: 'meter', guid: meter.guid } }, `${prefix}Meter: ${meter.name}`, routes.facilityMeterRoute(facility.guid, meter.guid));
    for (const predictor of snapshot.predictors.filter(item => item.accountId === account.guid && item.facilityId === facility.guid))
      add({ area: 'data', owner, resource: { kind: 'predictor', guid: predictor.guid } }, `${prefix}Predictor: ${predictor.name}`, routes.facilityPredictorRoute(facility.guid, predictor.guid));
    for (const item of snapshot.energyUseEquipment.filter(item => item.accountId === account.guid && item.facilityId === facility.guid
      && snapshot.energyUseGroups.some(group => group.guid === item.energyUseGroupId && group.facilityId === facility.guid && group.accountId === account.guid)))
      add({ area: 'data', owner, resource: { kind: 'equipment', guid: item.guid } }, `${prefix}Equipment: ${item.name}`, routes.facilityEnergyUseRoute(facility.guid, item.energyUseGroupId, item.guid));
    for (const analysis of snapshot.facilityAnalyses.filter(item => item.accountId === account.guid && item.facilityId === facility.guid))
      add({ area: 'analysis', owner, resource: { kind: 'analysis', guid: analysis.guid } }, `${prefix}Analysis: ${analysis.name}`, routes.facilityAnalysisWorkbenchRoute(facility.guid, analysis.guid));
  }
  for (const analysis of snapshot.accountAnalyses.filter(item => item.accountId === account.guid && !account.isSingleFacilityCompany))
    add({ area: 'analysis', owner: { kind: 'account', guid: account.guid }, resource: { kind: 'analysis', guid: analysis.guid } }, `${account.name} · Analysis: ${analysis.name}`, routes.accountAnalysisWorkbenchRoute(account.guid, analysis.guid));
  return choices;
}

export function availableHomeCharts(snapshot: AccountWorkspaceSnapshot) {
  return snapshot.savedVisualizations.flatMap(record => {
    if (record.accountId !== snapshot.account.guid) return [];
    const read = readSavedVisualization(record);
    if (read.state !== 'valid' && read.state !== 'setup-required' || !('definition' in read)
      || inspectVisualizationReferences(read.definition, snapshot, record.preservation?.references).length) return [];
    const selection = read.definition.facilitySelection;
    const context = selection.kind === 'all' ? 'All facilities (live)' : selection.facilityGuids.map(guid => snapshot.facilities.find(facility => facility.guid === guid)?.name ?? 'Unavailable facility').join(', ');
    return [{ guid: record.guid, label: read.definition.name, context }];
  });
}

/** Future renderers can replace deferred content while keeping structure, saved intent and state labels. */
export function homeWidgetView(record: Readonly<Pick<IdbHomeDashboard, 'accountId' | 'preservation'>>, widget: HomeWidget, snapshot: AccountWorkspaceSnapshot, acknowledged: readonly string[] = [], shortcuts?: readonly HomeShortcutChoice[]): HomeWidgetView {
  const base = { widget, title: widget.title || HOME_WIDGET_LABELS[widget.kind] };
  const references = homeReferences({ version: 1, name: 'Widget', visibility: 'always', defaults: {}, widgets: [widget] });
  const blockedPaths = (record.preservation?.references ?? []).filter(issue => !acknowledged.includes(issue.path)
    && references.some(ref => ref.path === issue.path)).map(issue => issue.path);
  if (blockedPaths.length) return { ...base, state: 'repair-required', blockedPaths, message: 'This widget has preserved unavailable relationships. Its saved intent is retained.' };
  if (widget.kind === 'table' && widget.settings.view === 'facility-progress' && (widget.settings.period !== 'latest-result' || !widget.settings.categories && !['energy', 'water'].includes(widget.settings.measure))) return { ...base, state: 'unsupported', message: 'Facility progress requires latest reporting results and energy/water categories. Saved settings are preserved; replace this widget with a supported progress table.' };
  if (widget.kind === 'actions' || widget.kind === 'goal' || widget.kind === 'table' && widget.settings.view === 'facility-progress') return { ...base, state: 'ready', message: '' };
  if (widget.kind === 'note') return { ...base, state: 'ready', message: '' };
  if (widget.kind === 'built-in-chart') {
    const built = buildHomeChart(widget.reference, snapshot.account.guid);
    return built.state === 'ready' ? { ...base, title: widget.title || built.definition.name, state: 'ready', message: '' }
      : { ...base, state: 'unsupported', message: built.message };
  }
  if (widget.kind === 'shortcut') {
    const shortcut = (shortcuts ?? homeShortcutChoices(snapshot)).find(choice => choice.key === shortcutKey(widget.destination));
    return shortcut ? { ...base, state: 'ready', message: '', shortcut, context: shortcut.label }
      : { ...base, state: 'missing-source', message: 'This internal destination is unavailable or does not match its declared owner. Choose a verified destination or remove the widget.' };
  }
  if (widget.kind === 'visualization') {
    const chart = snapshot.savedVisualizations.find(chart => chart.guid === widget.visualizationGuid && chart.accountId === record.accountId);
    if (!chart) return { ...base, state: 'missing-source', message: 'The linked saved visualization is unavailable. Its reference is preserved.' };
    const read = readSavedVisualization(chart);
    if (read.state !== 'valid' && read.state !== 'setup-required') return { ...base, state: read.state, message: 'The linked saved visualization needs review or a compatible version. Its reference is preserved.' };
    if (inspectVisualizationReferences(read.definition, snapshot, chart.preservation?.references).length)
      return { ...base, state: 'repair-required', message: 'The linked visualization has unavailable sources. Open it to review its sources, replace the link, or remove this widget.' };
    const selection = read.definition.facilitySelection;
    const context = selection.kind === 'all' ? 'All facilities (live)' : selection.facilityGuids.map(guid => snapshot.facilities.find(facility => facility.guid === guid)?.name ?? 'Unavailable facility').join(', ');
    return { ...base, title: widget.title || read.definition.name, state: 'ready', context,
      message: '' };
  }
  return { ...base, state: 'deferred', message: `${HOME_WIDGET_LABELS[widget.kind]} content will be available in a later Home update. Its settings are preserved.` };
}
