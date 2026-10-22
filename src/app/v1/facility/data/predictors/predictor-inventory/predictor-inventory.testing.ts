import { computed, signal } from '@angular/core';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbPredictor, getNewIdbPredictor } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { buildPredictorCards, buildWeatherStationGroups } from '../models';
import { StatusEvaluationState } from '@app/v1/status/status.models';

export function inventoryPredictor(guid: string, options: Partial<IdbPredictor> = {}): IdbPredictor {
  return { ...getNewIdbPredictor('account', 'facility'), id: Number(guid.replace(/\D/g, '')) || 1, guid, name: guid,
    production: false, unit: 'tons', ...options };
}
export function inventoryReading(predictorId: string, options: Partial<IdbPredictorData> = {}): IdbPredictorData {
  return { id: 100, guid: `reading-${predictorId}`, accountId: 'account', facilityId: 'facility', predictorId,
    year: 2025, month: 1, amount: 12, ...options } as IdbPredictorData;
}
export function inventoryWorkspace(count = 3) {
  const account = signal({ guid: 'account', name: 'Account' });
  const facility = signal<IdbFacility | undefined>({ guid: 'facility', accountId: 'account', name: 'Facility' } as IdbFacility);
  const predictors = signal(Array.from({ length: count }, (_, index) => inventoryPredictor(`p${index + 1}`, index % 3 === 1 ? {
    predictorType: 'Weather', weatherStationId: 'KORD', weatherStationName: 'Chicago', weatherDataType: 'HDD', heatingBaseTemperature: 65, unit: 'HDD'
  } : {})));
  const predictorReadings = signal(predictors().map(item => inventoryReading(item.guid)));
  const state = signal<StatusEvaluationState>('ready');
  return { account, facility, predictors, predictorReadings, statusState: state, revision: signal(1), canWrite: signal(true), hasPending: signal(false), isLoading: signal(false),
    predictorCards: computed(() => buildPredictorCards(predictors(), predictorReadings(), [], state() === 'ready')),
    weatherStationGroups: computed(() => buildWeatherStationGroups(predictors(), predictorReadings(), [], state() === 'ready')) };
}
export const inventoryNavigation = {
  facilityMeterGroupRoute: (facilityGuid: string, groupGuid: string, tab = 'monthly-table') => ['/v1', 'workspace', 'facility', facilityGuid, 'data', 'meter-grouping', groupGuid, tab],
  isSingleSiteWorkspace: signal(false),
  accountDataReturnRoute: (guid: string) => ['/v1', 'workspace', 'account', guid, 'data', 'portfolio', 'predictors'],
  facilityDataRoute: (guid: string, detail: string) => ['/v1', 'workspace', 'facility', guid, 'data', detail],
  facilityPredictorRoute: (facility: string, guid: string, tab: string) => ['/v1', 'workspace', 'facility', facility, 'data', 'predictors', guid, tab],
  facilityWeatherPredictorRoute: (facility: string, key: string, tab = 'setup') => ['/v1', 'workspace', 'facility', facility, 'data', 'predictors', 'weather', key, tab],
  facilityWeatherPredictorQualityRoute: (facility: string, key: string, guid: string) => ['/v1', 'workspace', 'facility', facility, 'data', 'predictors', 'weather', key, 'quality', guid],
  facilityWeatherPredictorCreateRoute: (facility: string) => ['/v1', 'workspace', 'facility', facility, 'data', 'predictors', 'weather', 'new']
};
