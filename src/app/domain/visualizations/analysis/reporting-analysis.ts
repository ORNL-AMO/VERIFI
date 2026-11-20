import type { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import type { ReportingAnalysisBinding } from '../../home/home-dashboard';
import type { VisualizationDefinition } from '../visualization-definition';

export function resolveReportingAnalysis(binding: ReportingAnalysisBinding, snapshot: AccountWorkspaceSnapshot) {
  const owner = binding.owner.kind === 'account'
    ? snapshot.account.guid === binding.owner.guid ? snapshot.account : undefined
    : snapshot.facilities.find(item => item.guid === binding.owner.guid && item.accountId === snapshot.account.guid);
  if (!owner) return { state: 'missing-source' as const, message: 'The reporting owner is unavailable in this account.' };
  const guid = binding.category === 'energy' ? owner.selectedEnergyAnalysisId : owner.selectedWaterAnalysisId;
  if (!guid) return { state: 'setup-required' as const, message: `Choose an Active for reporting ${binding.category} analysis for this owner in Analysis.` };
  const analysis = binding.owner.kind === 'account'
    ? snapshot.accountAnalyses.find(item => item.guid === guid && item.accountId === snapshot.account.guid)
    : snapshot.facilityAnalyses.find(item => item.guid === guid && item.accountId === snapshot.account.guid && item.facilityId === binding.owner.guid);
  if (!analysis || analysis.analysisCategory !== binding.category)
    return { state: 'missing-source' as const, message: `The selected reporting ${binding.category} analysis is missing, belongs to another owner, or has the wrong category. Review Active for reporting in Analysis.` };
  return { state: 'ready' as const, analysis };
}

/** Request-only expansion. The saved rule and exact named sources are never rewritten. */
export function resolveReportingVisualization(definition: VisualizationDefinition, snapshot: AccountWorkspaceSnapshot):
  | { readonly state: 'ready'; readonly definition: VisualizationDefinition; readonly context: readonly string[] }
  | { readonly state: 'setup-required' | 'missing-source'; readonly message: string } {
  const context: string[] = [];
  const sources = [...definition.sources];
  for (const [index, source] of sources.entries()) {
    if (source.kind !== 'analysis' || source.mode !== 'result' || !source.reporting) continue;
    const resolved = resolveReportingAnalysis(source.reporting, snapshot);
    if (resolved.state !== 'ready') return resolved;
    const { reporting, ...exact } = source;
    sources[index] = { ...exact, analysisGuid: resolved.analysis.guid };
    context.push(`Active for reporting · ${reporting.category} · ${resolved.analysis.name}`);
  }
  return { state: 'ready', definition: context.length ? { ...definition, sources } : definition, context };
}
