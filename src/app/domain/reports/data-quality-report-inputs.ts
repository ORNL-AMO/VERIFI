import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';

export interface DataQualityMeterInput {
  readonly meter: IdbUtilityMeter;
  readonly readings: readonly IdbUtilityMeterData[];
}

export interface DataQualityPredictorInput {
  readonly predictor: IdbPredictor;
  readonly readings: readonly IdbPredictorData[];
}

export function buildDataQualityPredictorInputs(snapshot: AccountWorkspaceSnapshot, facilityGuid: string,
  predictorGuids: readonly string[]): DataQualityPredictorInput[] {
  const accountGuid = snapshot.account.guid;
  if (!snapshot.facilities.some(item => item.guid === facilityGuid && item.accountId === accountGuid)) {
    throw new Error('The report facility is unavailable. Review Setup before continuing.');
  }
  const owned = (item: { accountId: string; facilityId: string }) => item.accountId === accountGuid && item.facilityId === facilityGuid;
  const readings = new Map<string, IdbPredictorData[]>();
  const selected = new Set(predictorGuids);
  for (const reading of snapshot.predictorData) {
    if (!owned(reading) || !selected.has(reading.predictorId)) continue;
    const entries = readings.get(reading.predictorId) ?? [];
    entries.push(reading);
    readings.set(reading.predictorId, entries);
  }
  return [...selected].map(guid => {
    const predictor = snapshot.predictors.find(item => item.guid === guid && owned(item));
    if (!predictor) throw new Error('A selected predictor is unavailable. Review Setup before continuing.');
    return structuredClone({ predictor, readings: readings.get(guid) ?? [] });
  });
}

export function buildDataQualityMeterInputs(snapshot: AccountWorkspaceSnapshot, facilityGuid: string,
  meterGuids: readonly string[]): DataQualityMeterInput[] {
  const accountGuid = snapshot.account.guid;
  if (!snapshot.facilities.some(item => item.guid === facilityGuid && item.accountId === accountGuid)) {
    throw new Error('The report facility is unavailable. Review Setup before continuing.');
  }
  const owned = (item: { accountId: string; facilityId: string }) => item.accountId === accountGuid && item.facilityId === facilityGuid;
  const readings = new Map<string, IdbUtilityMeterData[]>();
  const selected = new Set(meterGuids);
  for (const reading of snapshot.meterData) {
    if (!owned(reading) || !selected.has(reading.meterId)) continue;
    const entries = readings.get(reading.meterId) ?? [];
    entries.push(reading);
    readings.set(reading.meterId, entries);
  }
  return [...selected].map(guid => {
    const meter = snapshot.meters.find(item => item.guid === guid && owned(item));
    if (!meter) throw new Error('A selected meter is unavailable. Review Setup before continuing.');
    return structuredClone({ meter, readings: readings.get(guid) ?? [] });
  });
}
