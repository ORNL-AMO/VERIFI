import { meterReadingEntityKey } from './meter-reading-import-review';
import { predictorReadingEntityKey } from './predictor-reading-import-review';
import { ImportCommitRequest, ImportFileDraft } from './spreadsheet-import.models';

export function buildSpreadsheetImportCommitRequest(
  draft: ImportFileDraft,
  accountGuid: string
): ImportCommitRequest {
  const meters = draft.meters.filter(meter => !meter.skipImport);
  const predictors = draft.predictors.filter(predictor => !predictor.skipImport);
  const meterIds = new Set(meters.map(meter => meter.guid));
  const predictorIds = new Set(predictors.map(predictor => predictor.guid));
  const meterReadingEntries = draft.meterData
    .map((reading, index) => ({ reading, index }))
    .filter(entry => meterIds.has(entry.reading.meterId));
  const predictorReadingEntries = draft.predictorData
    .map((reading, index) => ({ reading, index }))
    .filter(entry => predictorIds.has(entry.reading.predictorId));
  const affectedFacilities = new Set([
    ...meters.map(meter => meter.facilityId),
    ...predictors.map(predictor => predictor.facilityId),
    ...draft.facilityEnergyUseGroups.map(group => group.facilityId)
  ]);

  return {
    accountGuid,
    draftId: draft.id,
    kind: draft.kind,
    facilities: draft.kind === 'footprint-tool'
      ? []
      : draft.kind === 'general-workbook'
        ? draft.importFacilities.filter(facility => affectedFacilities.has(facility.guid))
        : draft.importFacilities,
    meterGroups: draft.newMeterGroups.filter(group => affectedFacilities.has(group.facilityId)
      && meters.some(meter => meter.groupId === group.guid)),
    meters,
    meterReadings: meterReadingEntries.map(entry => entry.reading),
    predictors,
    predictorReadings: predictorReadingEntries.map(entry => entry.reading),
    energyUseGroups: draft.facilityEnergyUseGroups,
    energyUseEquipment: draft.facilityEnergyUseEquipment,
    skipExistingReadingsMeterIds: draft.skipExistingReadingsMeterIds,
    skipExistingPredictorIds: draft.skipExistingPredictorIds,
    excludedMeterReadingIds: remapExclusions(
      meterReadingEntries,
      draft.excludedMeterReadingIds,
      meterReadingEntityKey
    ),
    invalidMeterReadingsAcknowledged: draft.invalidMeterReadingsAcknowledged,
    excludedPredictorReadingIds: remapExclusions(
      predictorReadingEntries,
      draft.excludedPredictorReadingIds,
      predictorReadingEntityKey
    ),
    invalidPredictorReadingsAcknowledged: draft.invalidPredictorReadingsAcknowledged
  };
}

export function hasSpreadsheetImportRecords(request: ImportCommitRequest): boolean {
  return [
    request.facilities,
    request.meterGroups,
    request.meters,
    request.meterReadings,
    request.predictors,
    request.predictorReadings,
    request.energyUseGroups,
    request.energyUseEquipment
  ].some(records => records.length > 0);
}

function remapExclusions<T>(
  entries: ReadonlyArray<{ reading: T; index: number }>,
  exclusions: ReadonlyArray<number | string>,
  entityKey: (reading: T, index?: number) => string
): Array<number | string> {
  const excluded = new Set(exclusions.map(String));
  return entries.reduce<Array<number | string>>((keys, entry, filteredIndex) => {
    if (excluded.has(entityKey(entry.reading, entry.index)) || excluded.has(entityKey(entry.reading))) {
      keys.push(entityKey(entry.reading, filteredIndex));
    }
    return keys;
  }, []);
}
