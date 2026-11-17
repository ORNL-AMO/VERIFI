import { getNewIdbPredictor } from '@data/models/idbModels/predictor';
import { getNewIdbPredictorData } from '@data/models/idbModels/predictorData';
import { meter, reading } from '@app/v1/data/meters/facility-meters.testing';
import type { VisualizationDefinition, PredictorVisualizationSource } from '@domain/visualizations/visualization-definition';
import { createVisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { utilityVisualizationFixture } from '@domain/visualizations/testing/visualization-fixtures';
import { savedVisualizationFixture, visualizationBackupSnapshot } from './visualization-backup.testing';

/** Populated saved histories exercise transfer semantics independently of weather retrieval. */
export function predictorVisualizationBackupSnapshot() {
  const original = visualizationBackupSnapshot(), account = { ...original.account, energyUnit: 'kWh', energyIsSource: false };
  const facility = { ...original.facilities[0], energyUnit: 'kWh', energyIsSource: false };
  const standard = { ...getNewIdbPredictor(account.guid, facility.guid), guid: 'predictor-a', name: 'Production', unit: 'widgets' };
  const weather = { ...getNewIdbPredictor(account.guid, facility.guid), guid: 'weather-a', name: 'CDD', unit: 'days', predictorType: 'Weather' as const,
    weatherDataType: 'CDD' as const, weatherStationId: 'saved-station', weatherStationName: 'Saved station', coolingBaseTemperature: 65 };
  const predictorData = [
    { ...getNewIdbPredictorData(standard), guid: 'production-zero', year: 2026, month: 1, amount: 0 },
    { ...getNewIdbPredictorData(standard), guid: 'production-march', year: 2026, month: 3, amount: 12 },
    { ...getNewIdbPredictorData(weather), guid: 'weather-override', year: 2026, month: 1, amount: -4, weatherDataWarning: true, weatherDataChanged: true, weatherOverride: true },
    { ...getNewIdbPredictorData(weather), guid: 'weather-duplicate-a', year: 2026, month: 2, amount: 2 },
    { ...getNewIdbPredictorData(weather), guid: 'weather-duplicate-b', year: 2026, month: 2, amount: 3 },
    { ...getNewIdbPredictorData(weather), guid: 'weather-march', year: 2026, month: 3, amount: 8 }
  ];
  const source: PredictorVisualizationSource = { id: 'predictors:history', kind: 'predictor', measure: 'value', aggregation: 'none',
    selection: { kind: 'fixed', resource: 'predictor', guids: [standard.guid, weather.guid] } };
  const fixed: VisualizationDefinition = { ...createVisualizationDefinition('Fixed predictors', account.guid, { kind: 'all' }, 'predictor'),
    sources: [source], chart: { kind: 'time-series', defaultTraceType: 'line', interval: 'monthly', stack: 'none' },
    series: [{ id: 'values', sourceId: source.id, metric: 'value', axis: 'left', overrides: [
      { seriesId: `${source.id}:predictor:${weather.guid}`, label: 'Saved cooling', color: '#23684d', axis: 'right', traceType: 'bar', lineStyle: 'dashed', order: 0 },
      { resourceGuid: standard.guid, color: '#b44a19', order: 1 },
      { seriesId: `${source.id}:predictor:dormant`, accountGuid: account.guid, visible: false, label: 'Dormant original' }
    ] }] };
  const all: VisualizationDefinition = { ...fixed, name: 'All predictors', sources: [{ ...source, selection: { kind: 'rule', resource: 'predictor', filter: {} } }] };
  const utility = utilityVisualizationFixture();
  const mixed: VisualizationDefinition = { ...all, name: 'Mixed history', sources: [...utility.sources, ...all.sources], series: [...utility.series, ...all.series] };
  return { ...original, account, facilities: [facility], predictors: [standard, weather], predictorData,
    meters: [meter({ meterReadingDataApplication: 'fullMonth' })], meterData: [reading({ totalEnergyUse: 10 })],
    savedVisualizations: [fixed, all, mixed].map((definition, index) => savedVisualizationFixture(definition, `predictor-visualization-${index}`)) };
}
