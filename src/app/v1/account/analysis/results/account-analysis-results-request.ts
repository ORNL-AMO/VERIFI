import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { AccountAnalysisResultsWorkerRequest } from '@platform/web-workers/account-analysis-results-worker.contract';
import { analysisDependencyClosure } from '@app/v1/facility/analysis/facility-analysis-workbench/results/calculation/facility-analysis-results-request';

export function buildAccountAnalysisResultsRequest(
  analysis: IdbAccountAnalysisItem,
  snapshot: AccountWorkspaceSnapshot,
  reportYear?: number
): AccountAnalysisResultsWorkerRequest {
  const selected = (analysis.facilityAnalysisItems ?? []).flatMap(link => {
    if (!link.analysisItemId || link.analysisItemId === 'skip') return [];
    const item = snapshot.facilityAnalyses.find(candidate => candidate.guid === link.analysisItemId && candidate.facilityId === link.facilityId);
    return item ? [item] : [];
  });
  const dependencyByGuid = new Map<string, IdbAnalysisItem>();
  selected.forEach(item => analysisDependencyClosure(item, snapshot.facilityAnalyses).forEach(dependency => dependencyByGuid.set(dependency.guid, dependency)));
  const facilityGuids = new Set(selected.map(item => item.facilityId));
  const groupGuids = new Set([...dependencyByGuid.values()].flatMap(item => item.groups ?? []).map(group => group.idbGroupId));
  const predictorGuids = new Set([...dependencyByGuid.values()]
    .flatMap(item => item.groups ?? [])
    .flatMap(group => [
      ...(group.predictorVariables ?? []),
      ...(group.models?.find(model => model.modelId === group.selectedModelId)?.predictorVariables ?? [])
    ]).map(predictor => predictor.id));
  const meters = snapshot.meters.filter(meter => facilityGuids.has(meter.facilityId) && groupGuids.has(meter.groupId));
  const meterGuids = new Set(meters.map(meter => meter.guid));
  return {
    accountAnalysisItem: structuredClone(analysis),
    account: structuredClone(snapshot.account),
    accountFacilities: structuredClone(snapshot.facilities.filter(facility => facilityGuids.has(facility.guid))),
    accountPredictorEntries: structuredClone(snapshot.predictorData.filter(entry => facilityGuids.has(entry.facilityId) && predictorGuids.has(entry.predictorId))),
    allAccountAnalysisItems: structuredClone([...dependencyByGuid.values()]),
    calculateAllMonthlyData: true,
    meters: structuredClone(meters),
    meterData: structuredClone(snapshot.meterData.filter(entry => meterGuids.has(entry.meterId))),
    accountPredictors: structuredClone(snapshot.predictors.filter(predictor => facilityGuids.has(predictor.facilityId) && predictorGuids.has(predictor.guid))),
    reportYear
  };
}

export function accountAnalysisResultsFingerprint(request: AccountAnalysisResultsWorkerRequest): string {
  const serialized = JSON.stringify(stableCalculationValue({
    accountAnalysis: request.accountAnalysisItem,
    account: request.account,
    facilities: request.accountFacilities,
    facilityAnalyses: request.allAccountAnalysisItems,
    predictorData: request.accountPredictorEntries,
    predictors: request.accountPredictors,
    meters: request.meters,
    meterData: request.meterData,
    calculateAllMonthlyData: request.calculateAllMonthlyData,
    reportYear: request.reportYear
  }));
  let hash = 2166136261;
  for (let index = 0; index < serialized.length; index++) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${request.accountAnalysisItem.guid}:${(hash >>> 0).toString(16)}:${serialized.length}`;
}

const DISPLAY_ONLY_KEYS = new Set(['name', 'createdDate', 'modifiedDate', 'checked', 'isAnalysisVisited', 'dataCheckReviews']);

function stableCalculationValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableCalculationValue).sort((first, second) => JSON.stringify(first).localeCompare(JSON.stringify(second)));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([key, nested]) => !DISPLAY_ONLY_KEYS.has(key) && !(key === 'id' && (nested === undefined || typeof nested === 'number')))
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([key, nested]) => [key, stableCalculationValue(nested)]));
  }
  return value;
}
