import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { FacilityAnalysisResultsWorkerRequest } from '@platform/web-workers/facility-analysis-results-worker.contract';

export function analysisDependencyClosure(
  analysis: IdbAnalysisItem,
  candidates: readonly IdbAnalysisItem[]
): readonly IdbAnalysisItem[] {
  const byGuid = new Map(candidates.map(candidate => [candidate.guid, candidate]));
  const dependencies: IdbAnalysisItem[] = [];
  const visited = new Set<string>();
  let current: IdbAnalysisItem | undefined = analysis;
  while (current && !visited.has(current.guid)) {
    visited.add(current.guid);
    dependencies.push(current);
    current = current.hasBanking && current.bankedAnalysisItemId
      ? byGuid.get(current.bankedAnalysisItemId)
      : undefined;
  }
  return dependencies;
}

export function facilityAnalysisResultsFingerprint(request: FacilityAnalysisResultsWorkerRequest): string {
  const value = JSON.stringify({
    analysis: calculationAnalysis(request.analysisItem),
    dependencies: request.accountAnalysisItems
      .filter(item => item.guid !== request.analysisItem.guid)
      .map(calculationAnalysis)
      .sort(compareGuid),
    facility: {
      guid: request.facility.guid,
      fiscalYear: request.facility.fiscalYear,
      fiscalYearMonth: request.facility.fiscalYearMonth,
      fiscalYearCalendarEnd: request.facility.fiscalYearCalendarEnd,
      energyUnit: request.analysisItem.energyUnit,
      waterUnit: request.analysisItem.waterUnit,
      energyIsSource: request.analysisItem.energyIsSource
    },
    meters: [...request.calanderizedMeters].sort((first, second) => first.meter.guid.localeCompare(second.meter.guid)),
    predictorData: [...request.accountPredictorEntries].sort((first, second) =>
      first.predictorId.localeCompare(second.predictorId)
      || first.year - second.year
      || first.month - second.month
      || first.guid.localeCompare(second.guid)),
    predictors: [...request.accountPredictors].sort(compareGuid),
    reportYear: request.reportYear,
    calculateAllMonthlyData: request.calculateAllMonthlyData,
    includeGroupSummaries: request.includeGroupSummaries
  });
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${request.analysisItem.guid}:${(hash >>> 0).toString(16)}:${value.length}`;
}

export function projectFacilityPredictorInputs(
  facilityGuid: string,
  entries: readonly IdbPredictorData[],
  predictors: readonly IdbPredictor[]
): { readonly entries: readonly IdbPredictorData[]; readonly predictors: readonly IdbPredictor[] } {
  return {
    entries: entries.filter(entry => entry.facilityId === facilityGuid),
    predictors: predictors.filter(predictor => predictor.facilityId === facilityGuid)
  };
}

function calculationAnalysis(analysis: IdbAnalysisItem): object {
  return {
    guid: analysis.guid,
    facilityId: analysis.facilityId,
    analysisCategory: analysis.analysisCategory,
    energyIsSource: analysis.energyIsSource,
    energyUnit: analysis.energyUnit,
    waterUnit: analysis.waterUnit,
    baselineYear: analysis.baselineYear,
    hasBanking: analysis.hasBanking,
    bankedAnalysisItemId: analysis.bankedAnalysisItemId,
    groups: analysis.groups
  };
}

function compareGuid(first: { readonly guid: string }, second: { readonly guid: string }): number {
  return first.guid.localeCompare(second.guid);
}
