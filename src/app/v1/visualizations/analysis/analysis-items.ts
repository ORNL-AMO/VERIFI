import type { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import type { VisualizationDefinition, VisualizationScope } from '@domain/visualizations/visualization-definition';
import { accountAnalysisInclusionIssue, analysisMeasureLabels, analysisSeriesId, analysisUnit } from '@domain/visualizations/analysis/facility-analysis-source';
import { resolveVisualizationFacilities } from '@domain/visualizations/visualization-facilities';
import type { VisualizationDecisionItem } from '../decisions/decision-types';
import { itemKey, isCustomized, resolveItemPresentation } from '../shared/item-appearance';
import { resolveReportingAnalysis } from '@domain/visualizations/analysis/reporting-analysis';

/** Choices inspect saved identities only; never request calculation work. */
export function facilityAnalysisChoices(snapshot: AccountWorkspaceSnapshot, scope: VisualizationScope) {
  return snapshot.facilityAnalyses.filter(item => item.accountId === snapshot.account.guid && scope.facilityGuids.includes(item.facilityId)
    && snapshot.facilities.some(f => f.guid === item.facilityId && f.accountId === snapshot.account.guid))
    .map(item => ({ value: item.guid, label: `${item.name || 'Unnamed analysis'} · ${snapshot.facilities.find(f => f.guid === item.facilityId)?.name ?? ''}` }));
}
/** Hidden single-facility account pairs remain exact saved references, never new choices. */
export function analysisChoices(snapshot: AccountWorkspaceSnapshot, scope: VisualizationScope, allFacilities: boolean) {
  const account = snapshot.account;
  const single = account.isSingleFacilityCompany === true && snapshot.facilities.filter(item => item.accountId === account.guid).length === 1;
  return [...(allFacilities && !single ? snapshot.accountAnalyses.filter(item => item.accountId === account.guid
    && !accountAnalysisInclusionIssue((item.facilityAnalysisItems ?? []).filter(link => link.analysisItemId && link.analysisItemId !== 'skip').map(link => link.facilityId), scope.facilityGuids))
    .map(item => ({ value: item.guid, label: `${item.name || 'Unnamed analysis'} · Account` })) : []), ...facilityAnalysisChoices(snapshot, scope)];
}
export function analysisGroupChoices(snapshot: AccountWorkspaceSnapshot, analysisGuid?: string) {
  return snapshot.facilityAnalyses.find(item => item.accountId === snapshot.account.guid && item.guid === analysisGuid)?.groups
    .filter(group => !['skip', 'skipAnalysis'].includes(group.analysisType))
    .map(group => ({ value: group.idbGroupId, label: snapshot.meterGroups.find(item => item.guid === group.idbGroupId)?.name ?? group.idbGroupId })) ?? [];
}
export function projectAnalysisItems(definition: VisualizationDefinition, sourceId: string, snapshot: AccountWorkspaceSnapshot): readonly VisualizationDecisionItem[] {
  const declared = definition.sources.find(item => item.id === sourceId);
  if (declared?.kind !== 'analysis' || declared.mode !== 'result') return [];
  const reporting = declared.reporting && resolveReportingAnalysis(declared.reporting, snapshot);
  if (reporting && reporting.state !== 'ready') return [];
  const source = { ...declared, ...(reporting?.state === 'ready' ? { analysisGuid: reporting.analysis.guid } : {}) };
  if (!source.analysisGuid) return [];
  const facilityAnalysis = snapshot.facilityAnalyses.find(item => item.guid === source.analysisGuid && item.accountId === definition.accountGuid);
  const accountAnalysis = snapshot.accountAnalyses.find(item => item.guid === source.analysisGuid && item.accountId === definition.accountGuid);
  const analysis = facilityAnalysis ?? accountAnalysis;
  const scope = resolveVisualizationFacilities(definition, snapshot.facilities).scope;
  const available = !!analysis && (facilityAnalysis ? facilityAnalysisChoices(snapshot, scope).some(item => item.value === analysis.guid)
    && (!source.groupGuid || analysisGroupChoices(snapshot, analysis.guid).some(item => item.value === source.groupGuid))
    : !source.groupGuid && !accountAnalysisInclusionIssue((accountAnalysis!.facilityAnalysisItems ?? []).filter(link => link.analysisItemId && link.analysisItemId !== 'skip').map(link => link.facilityId), scope.facilityGuids));
  const identity = { resourceGuid: source.groupGuid ?? source.analysisGuid }, id = analysisSeriesId(source.id);
  const { series, override, appearance } = resolveItemPresentation(definition,
    { sourceId, metric: source.measure, identity, providerSeriesId: id });
  const scopeLabel = source.groupGuid ? analysisGroupChoices(snapshot, source.analysisGuid).find(item => item.value === source.groupGuid)?.label ?? 'Unavailable group' : accountAnalysis ? 'Account total' : 'Facility total';
  return [{ key: itemKey(identity), identity, sourceId, selectedId: series?.id ?? `${sourceId}-series`,
    scopeLabel, ...(facilityAnalysis ? { facilityGuid: facilityAnalysis.facilityId } : {}),
    label: analysis?.name ?? `Unavailable: ${source.analysisGuid}`, detail: `${scopeLabel} · ${analysisMeasureLabels[source.measure]}`,
    unit: analysis ? analysisUnit(analysis, source.measure) : '', available, missing: !available,
    customized: !!series && isCustomized(series) || !!override && isCustomized(override, true), customColor: series?.color !== undefined || override?.color !== undefined,
    appearance }];
}
