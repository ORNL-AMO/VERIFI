import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { DataQualityReportSettings } from '@data/models/idbModels/facilityReport';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';

export interface DataQualitySelectionInputs {
  readonly accountGuid: string;
  readonly facilityGuid: string;
  readonly settings: DataQualityReportSettings;
  readonly facilityAnalyses: readonly IdbAnalysisItem[];
  readonly meters: readonly IdbUtilityMeter[];
  readonly predictors: readonly IdbPredictor[];
}

export function resolveDataQualitySelection(input: DataQualitySelectionInputs) {
  const owned = (item: { accountId: string; facilityId: string }) =>
    item.accountId === input.accountGuid && item.facilityId === input.facilityGuid;
  const meters = input.meters.filter(owned), predictors = input.predictors.filter(owned);
  const settings = input.settings;
  const analysis = settings.selectedMode === 'analysis' ? input.facilityAnalyses.find(item =>
    owned(item) && item.guid === settings.selectedAnalysisItemId && ['energy', 'water'].includes(item.analysisCategory)) : undefined;
  const meterIds = new Set<string>(), predictorIds = new Set<string>();
  if (settings.selectedMode === 'manual') {
    settings.selectedMeterIds?.forEach(id => meterIds.add(id));
    settings.selectedPredictorIds?.forEach(id => predictorIds.add(id));
  } else if (analysis) {
    for (const group of analysis.groups ?? []) {
      if (group.analysisType === 'skip' || group.analysisType === 'skipAnalysis') continue;
      meters.filter(meter => meter.groupId === group.idbGroupId).forEach(meter => meterIds.add(meter.guid));
      const variables = group.analysisType === 'regression'
        ? group.isGeneratedModel ? group.models?.find(model => model.modelId === group.selectedModelId)?.predictorVariables : group.predictorVariables
        : ['energyIntensity', 'modifiedEnergyIntensity'].includes(group.analysisType) ? group.predictorVariables : [];
      for (const variable of variables ?? []) if (variable.id && variable.productionInAnalysis) predictorIds.add(variable.id);
    }
  }
  const selectedMeters = [...meterIds].flatMap(id => meters.filter(meter => meter.guid === id));
  const selectedPredictors = [...predictorIds].flatMap(id => predictors.filter(predictor => predictor.guid === id));
  const missingMeterIds = [...meterIds].filter(id => !meters.some(meter => meter.guid === id));
  const missingPredictorIds = [...predictorIds].filter(id => !predictors.some(predictor => predictor.guid === id));
  const hasSelection = settings.selectedMode === 'analysis' ? !!analysis
    : settings.selectedMode === 'manual' && meterIds.size + predictorIds.size > 0;
  return { analysis, meters: selectedMeters, predictors: selectedPredictors, missingMeterIds, missingPredictorIds,
    valid: hasSelection && !missingMeterIds.length && !missingPredictorIds.length };
}
