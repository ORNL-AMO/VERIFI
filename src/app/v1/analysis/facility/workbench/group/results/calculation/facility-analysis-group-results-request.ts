import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { FacilityAnalysisGroupResultsWorkerRequest } from '@platform/web-workers/facility-analysis-group-results-worker.contract';
import { analysisDependencyClosure } from '../../../results/calculation/facility-analysis-results-request';

export function projectAnalysisGroupDependencies(
  analysis: IdbAnalysisItem,
  groupGuid: string,
  candidates: readonly IdbAnalysisItem[]
): readonly IdbAnalysisItem[] {
  return analysisDependencyClosure(analysis, candidates).map(item => ({
    ...structuredClone(item),
    groups: item.groups.filter(group => group.idbGroupId === groupGuid).map(group => structuredClone(group))
  }));
}

export function projectAnalysisGroupPredictorInputs(
  facilityGuid: string,
  dependencies: readonly IdbAnalysisItem[],
  entries: readonly IdbPredictorData[],
  predictors: readonly IdbPredictor[]
): { readonly entries: readonly IdbPredictorData[]; readonly predictors: readonly IdbPredictor[] } {
  const predictorIds = new Set(dependencies.flatMap(item => item.groups.flatMap(group =>
    group.predictorVariables.map(variable => variable.id)
  )));
  return {
    entries: entries.filter(entry => entry.facilityId === facilityGuid && predictorIds.has(entry.predictorId)),
    predictors: predictors.filter(predictor => predictor.facilityId === facilityGuid && predictorIds.has(predictor.guid))
  };
}

export function facilityAnalysisGroupResultsFingerprint(
  request: FacilityAnalysisGroupResultsWorkerRequest
): string {
  const value = JSON.stringify({
    analysis: calculationAnalysis(request.analysisItem),
    dependencies: request.accountAnalysisItems
      .filter(item => item.guid !== request.analysisItem.guid)
      .map(calculationAnalysis)
      .sort(compareGuid),
    groupGuid: request.groupGuid,
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
    reportYear: request.reportYear
  });
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${request.analysisItem.guid}:${request.groupGuid}:${(hash >>> 0).toString(16)}:${value.length}`;
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
