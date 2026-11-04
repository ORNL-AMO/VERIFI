import { WeatherStation } from '@data/models/degreeDays';
import { IdbPredictor, WeatherDataType } from '@data/models/idbModels/predictor';
import { ConflictChoices, DraftMerge, draftEqual, reconcileFields, reconcileKeyedItems } from '@app/v1/data/editing/draft-reconciliation';

export interface WeatherDefinitionValue {
  readonly draftId: string;
  readonly predictorGuid: string | null;
  readonly weatherDataType: WeatherDataType;
  readonly name: string;
  readonly baseTemperature: number | null;
  readonly production: boolean;
}

export interface WeatherSetupValue {
  readonly station: WeatherStation | null;
  readonly startMonth: string;
  readonly endMonth: string;
  readonly definitions: readonly WeatherDefinitionValue[];
}

export function weatherEditIdentity(accountGuid: string | undefined, facilityGuid: string | undefined, key: string | undefined): string | undefined {
  return accountGuid && facilityGuid && key ? JSON.stringify([accountGuid, facilityGuid, key]) : undefined;
}

export function weatherCalculationFingerprint(predictors: readonly IdbPredictor[]): string {
  return JSON.stringify([...predictors].sort((a, b) => a.guid.localeCompare(b.guid)).map(predictor => [
    predictor.guid, predictor.weatherStationId, predictor.weatherDataType,
    predictor.heatingBaseTemperature, predictor.coolingBaseTemperature
  ]));
}

export function weatherSetupEqual(first: WeatherSetupValue, second: WeatherSetupValue): boolean {
  const ordered = (value: WeatherSetupValue) => ({ ...value, definitions: [...value.definitions]
    .sort((a, b) => (a.predictorGuid ?? a.draftId).localeCompare(b.predictorGuid ?? b.draftId)) });
  return draftEqual(ordered(first), ordered(second));
}

export function reconcileWeatherSetup(base: WeatherSetupValue, local: WeatherSetupValue, saved: WeatherSetupValue,
  choices: ConflictChoices = {}): DraftMerge<WeatherSetupValue> {
  const fields = reconcileFields(base, local, saved, {
    exclude: ['definitions'], choices
  });
  const definitions = reconcileKeyedItems(base.definitions, local.definitions, saved.definitions,
    definition => definition.predictorGuid ?? definition.draftId,
    (before, draft, latest, prefix) => reconcileFields(before, draft, latest, {
      exclude: ['draftId'], choices, prefix,
      groups: [{ id: 'calculation', label: `${draft.name || latest.name}: weather type, base, and name`, keys: ['weatherDataType', 'baseTemperature', 'name'] }]
    }), choices, 'predictors');
  return {
    value: { ...fields.value, definitions: definitions.value },
    baseline: { ...(fields.baseline ?? saved), definitions: definitions.baseline ?? saved.definitions },
    conflicts: [...fields.conflicts, ...definitions.conflicts]
  };
}
