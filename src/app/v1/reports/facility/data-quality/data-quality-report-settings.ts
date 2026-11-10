import { FormControl, FormGroup } from '@angular/forms';
import { DataQualityReportSettings, getDataQualityReportSettings } from '@data/models/idbModels/facilityReport';

export const METER_CONTENT_FLAGS = [
  'includeMeterStatisticsTable',
  'includeMeterConsumptionTimeseriesGraph',
  'includeMeterCostTimeseriesGraph',
  'includeMeterConsumptionHistogram',
  'includeMeterCostHistogram'
] as const;
export const PREDICTOR_CONTENT_FLAGS = [
  'includePredictorStatisticsTable',
  'includePredictorTimeseriesGraph',
  'includePredictorHistogram'
] as const;

export function dataQualitySettingsDraft(saved?: DataQualityReportSettings) {
  const settings = { ...getDataQualityReportSettings(), ...saved };
  return {
    selectedMode: settings.selectedMode,
    selectedAnalysisItemId: settings.selectedAnalysisItemId ?? null,
    selectedMeterIds: [...(settings.selectedMeterIds ?? [])],
    selectedPredictorIds: [...(settings.selectedPredictorIds ?? [])],
    includeMeter: settings.includeMeter,
    includeMeterStatisticsTable: settings.includeMeterStatisticsTable,
    includeMeterConsumptionTimeseriesGraph: settings.includeMeterConsumptionTimeseriesGraph,
    includeMeterCostTimeseriesGraph: settings.includeMeterCostTimeseriesGraph,
    includeMeterConsumptionHistogram: settings.includeMeterConsumptionHistogram,
    includeMeterCostHistogram: settings.includeMeterCostHistogram,
    includePredictors: settings.includePredictors,
    includePredictorStatisticsTable: settings.includePredictorStatisticsTable,
    includePredictorTimeseriesGraph: settings.includePredictorTimeseriesGraph,
    includePredictorHistogram: settings.includePredictorHistogram,
    // Older reports omitted this optional flag; their annual section was hidden.
    includeAnnualTotalsTable: saved ? saved.includeAnnualTotalsTable ?? false : settings.includeAnnualTotalsTable ?? true
  };
}

export type DataQualitySettingsDraft = ReturnType<typeof dataQualitySettingsDraft>;
export function dataQualitySettingsForm() {
  const draft = dataQualitySettingsDraft();
  return new FormGroup({
    selectedMode: new FormControl(draft.selectedMode, { nonNullable: true }),
    selectedAnalysisItemId: new FormControl<string | null>(null),
    selectedMeterIds: new FormControl<string[]>([], { nonNullable: true }),
    selectedPredictorIds: new FormControl<string[]>([], { nonNullable: true }),
    includeMeter: new FormControl(draft.includeMeter, { nonNullable: true }),
    includeMeterStatisticsTable: new FormControl(draft.includeMeterStatisticsTable, { nonNullable: true }),
    includeMeterConsumptionTimeseriesGraph: new FormControl(draft.includeMeterConsumptionTimeseriesGraph, { nonNullable: true }),
    includeMeterCostTimeseriesGraph: new FormControl(draft.includeMeterCostTimeseriesGraph, { nonNullable: true }),
    includeMeterConsumptionHistogram: new FormControl(draft.includeMeterConsumptionHistogram, { nonNullable: true }),
    includeMeterCostHistogram: new FormControl(draft.includeMeterCostHistogram, { nonNullable: true }),
    includePredictors: new FormControl(draft.includePredictors, { nonNullable: true }),
    includePredictorStatisticsTable: new FormControl(draft.includePredictorStatisticsTable, { nonNullable: true }),
    includePredictorTimeseriesGraph: new FormControl(draft.includePredictorTimeseriesGraph, { nonNullable: true }),
    includePredictorHistogram: new FormControl(draft.includePredictorHistogram, { nonNullable: true }),
    includeAnnualTotalsTable: new FormControl(draft.includeAnnualTotalsTable, { nonNullable: true })
  });
}
