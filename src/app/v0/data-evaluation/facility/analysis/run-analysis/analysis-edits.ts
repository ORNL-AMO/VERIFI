import { AnalysisGroup } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { AnalysisGroupChanges, FacilityAnalysisFieldChanges } from '@data/account-workspace/handlers/analysis-command-handler.service';
import * as _ from 'lodash';

/** Capture an editor's changes without carrying unrelated values into the command queue. */
export function getAnalysisGroupChanges(before: AnalysisGroup | AnalysisGroupChanges, after: Partial<AnalysisGroup> | AnalysisGroupChanges): AnalysisGroupChanges {
  const changes: AnalysisGroupChanges = {};
  for (const field of Object.keys(after)) {
    if (field !== 'idbGroupId' && field !== 'predictorVariables' && !_.isEqual(before[field], after[field])) {
      changes[field] = _.cloneDeep(after[field]);
    }
  }
  if (after.predictorVariables) {
    const predictorChanges = after.predictorVariables.flatMap(variable => {
      const previous = before.predictorVariables?.find(item => item.id === variable.id);
      if (!previous) { return []; }
      const change: NonNullable<AnalysisGroupChanges['predictorVariables']>[number] = { id: variable.id };
      if (previous.productionInAnalysis !== variable.productionInAnalysis) {
        change.productionInAnalysis = variable.productionInAnalysis;
      }
      if (previous.regressionCoefficient !== variable.regressionCoefficient) {
        change.regressionCoefficient = variable.regressionCoefficient;
      }
      return Object.keys(change).length > 1 ? [change] : [];
    });
    if (predictorChanges.length) { changes.predictorVariables = predictorChanges; }
  }
  return changes;
}

export function getFacilityAnalysisFieldChanges(before: IdbAnalysisItem, after: FacilityAnalysisFieldChanges): FacilityAnalysisFieldChanges {
  return Object.fromEntries(Object.entries(after).filter(([field, value]) => !_.isEqual(before[field], value)));
}
