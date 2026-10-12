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
  const selected = (analysis.facilityAnalysisItems ?? [])
    .filter(link => !!link.analysisItemId && link.analysisItemId !== 'skip')
    .map(link => snapshot.facilityAnalyses.find(item => item.guid === link.analysisItemId))
    .filter((item): item is IdbAnalysisItem => !!item);
  const dependencyByGuid = new Map<string, IdbAnalysisItem>();
  selected.forEach(item => analysisDependencyClosure(item, snapshot.facilityAnalyses)
    .forEach(dependency => dependencyByGuid.set(dependency.guid, dependency)));
  return {
    accountAnalysisItem: structuredClone(analysis),
    account: structuredClone(snapshot.account),
    accountFacilities: structuredClone(snapshot.facilities),
    accountPredictorEntries: structuredClone(snapshot.predictorData),
    allAccountAnalysisItems: structuredClone([...dependencyByGuid.values()]),
    calculateAllMonthlyData: true,
    meters: structuredClone(snapshot.meters),
    meterData: structuredClone(snapshot.meterData),
    accountPredictors: structuredClone(snapshot.predictors),
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

const DISPLAY_ONLY_KEYS = new Set([
  'id', 'name', 'createdDate', 'modifiedDate', 'checked', 'isAnalysisVisited'
]);

function stableCalculationValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableCalculationValue).sort((first, second) =>
      JSON.stringify(first).localeCompare(JSON.stringify(second))
    );
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !DISPLAY_ONLY_KEYS.has(key))
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([key, nested]) => [key, stableCalculationValue(nested)]));
  }
  return value;
}
