import { Injectable } from '@angular/core';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import { IndexedDbTransactionContext, IndexedDbTransactionService } from '@data/indexedDB/indexed-db-transaction.service';
import { VerifiStoreName } from '@data/indexedDB/indexed-db-schema';
import { IdbEntry } from '@data/models/idbModels/idbEntry';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { isImportMeterReadingValid, sameMeterReadingPeriod } from './meter-reading-import-review';
import {
  ImportCommitRequest,
  ImportCommitSummary,
  ImportEntityCounts
} from './spreadsheet-import.models';

const IMPORT_STORES: ReadonlyArray<VerifiStoreName> = [
  'facilities',
  'utilityMeterGroups',
  'utilityMeter',
  'utilityMeterData',
  'predictors',
  'predictorData',
  'facilityEnergyUseGroups',
  'facilityEnergyUseEquipment'
];

type ImportCollectionName = keyof ImportEntityCounts;

@Injectable({ providedIn: 'root' })
export class SpreadsheetImportCommandService {

  constructor(
    private readonly commandBoundary: WorkspaceCommandBoundary,
    private readonly workspaceStore: AccountWorkspaceStore,
    private readonly transactions: IndexedDbTransactionService
  ) { }

  async commit(request: ImportCommitRequest): Promise<ImportCommitSummary> {
    const result = await this.commandBoundary.execute({
      entityKind: 'account',
      changeKind: 'bulk',
      entityGuid: request.accountGuid,
      label: 'Importing spreadsheet data',
      notification: {
        successTitle: 'Import complete',
        successMessage: 'The imported data is ready to use.'
      }
    }, () => this.transactions.runTransaction(
      IMPORT_STORES,
      'readwrite',
      transaction => this.commitTransaction(transaction, request)
    ));
    return result.value;
  }

  private async commitTransaction(
    transaction: IndexedDbTransactionContext,
    request: ImportCommitRequest
  ): Promise<ImportCommitSummary> {
    this.validateAccount(request);

    const existing = await this.loadExisting(transaction);
    this.validateRelationships(request, existing);

    const excludedIds = new Set(request.excludedMeterReadingIds.map(String));
    const invalidReadings = request.meterReadings.filter(reading => !isImportMeterReadingValid(reading));
    const unacknowledgedInvalid = invalidReadings.filter(reading => !excludedIds.has(this.entityKey(reading)));
    if (unacknowledgedInvalid.length > 0 || (invalidReadings.length > 0 && !request.invalidMeterReadingsAcknowledged)) {
      throw new WorkspaceWriteError(
        'validation-failed',
        'Invalid meter readings must be explicitly excluded before importing.'
      );
    }

    const summary: ImportCommitSummary = {
      affectedFacilityGuids: this.affectedFacilityGuids(request),
      added: this.emptyCounts(),
      updated: this.emptyCounts(),
      skippedMeterReadings: 0,
      excludedInvalidMeterReadings: invalidReadings.length
    };

    await this.writeEntities(transaction, 'facilities', 'facilities', request.facilities, existing.facilities, summary);
    await this.writeEntities(transaction, 'utilityMeterGroups', 'meterGroups', request.meterGroups, existing.meterGroups, summary);
    await this.writeEntities(transaction, 'utilityMeter', 'meters', request.meters.map(meter => ({
      ...meter,
      visible: meter.id == null ? true : meter.visible
    })), existing.meters, summary);

    const meterReadings = request.meterReadings.filter(reading => {
      if (excludedIds.has(this.entityKey(reading)) || !isImportMeterReadingValid(reading)) return false;
      if (!request.skipExistingReadingsMeterIds.includes(reading.meterId)) return true;
      const exists = existing.meterReadings.some(candidate => sameMeterReadingPeriod(candidate, reading));
      if (exists) summary.skippedMeterReadings++;
      return !exists;
    });
    await this.writeEntities(transaction, 'utilityMeterData', 'meterReadings', meterReadings, existing.meterReadings, summary);

    await this.writeEntities(transaction, 'predictors', 'predictors', request.predictors, existing.predictors, summary);
    const predictorReadings = request.predictorReadings.filter(reading => {
      if (!request.skipExistingPredictorFacilityIds.includes(reading.facilityId)) return true;
      return !existing.predictorReadings.some(candidate => this.samePredictorReading(candidate, reading));
    });
    await this.writeEntities(transaction, 'predictorData', 'predictorReadings', predictorReadings, existing.predictorReadings, summary);
    await this.writeEntities(transaction, 'facilityEnergyUseGroups', 'energyUseGroups', request.energyUseGroups, existing.energyUseGroups, summary);
    await this.writeEntities(transaction, 'facilityEnergyUseEquipment', 'energyUseEquipment', request.energyUseEquipment, existing.energyUseEquipment, summary);
    return summary;
  }

  private validateAccount(request: ImportCommitRequest): void {
    const activeAccountGuid = this.workspaceStore.account()?.guid;
    if (!activeAccountGuid || activeAccountGuid !== request.accountGuid) {
      throw new WorkspaceWriteError('cross-account-entity', 'The import does not belong to the active account.');
    }
    const accountCollections = [
      ...request.facilities, ...request.meterGroups, ...request.meters,
      ...request.meterReadings, ...request.predictors, ...request.predictorReadings,
      ...request.energyUseGroups, ...request.energyUseEquipment
    ];
    if (accountCollections.some(entity => entity.accountId !== request.accountGuid)) {
      throw new WorkspaceWriteError('cross-account-entity', 'The import contains data for another account.');
    }
  }

  private validateRelationships(request: ImportCommitRequest, existing: ExistingImportData): void {
    const unique = (label: string, values: Array<string>) => {
      const populated = values.filter(Boolean);
      if (new Set(populated).size !== populated.length) {
        throw new WorkspaceWriteError('validation-failed', `The import contains duplicate ${label} identifiers.`);
      }
    };
    unique('facility', request.facilities.map(value => value.guid));
    unique('meter group', request.meterGroups.map(value => value.guid));
    unique('meter', request.meters.map(value => value.guid));
    unique('meter reading', request.meterReadings.map(value => value.guid));
    unique('predictor', request.predictors.map(value => value.guid));
    unique('predictor reading', request.predictorReadings.map(value => value.guid));
    unique('energy-use group', request.energyUseGroups.map(value => value.guid));
    unique('equipment', request.energyUseEquipment.map(value => value.guid));
    unique('meter reading date', request.meterReadings.map(value => `${value.meterId}:${value.year}:${value.month}:${value.day}`));
    unique('predictor reading month', request.predictorReadings.map(value => `${value.predictorId}:${value.year}:${value.month}`));

    const requestedGuids = [
      ...request.facilities, ...request.meterGroups, ...request.meters, ...request.meterReadings,
      ...request.predictors, ...request.predictorReadings, ...request.energyUseGroups,
      ...request.energyUseEquipment
    ].map(value => value.guid);
    if (requestedGuids.some(guid => existing.foreignGuids.has(guid))) {
      throw new WorkspaceWriteError('cross-account-entity', 'The import reuses an identifier owned by another account.');
    }

    const facilityIds = new Set([...existing.facilities, ...request.facilities].map(value => value.guid));
    const meterIds = new Set([...existing.meters, ...request.meters].map(value => value.guid));
    const predictorIds = new Set([...existing.predictors, ...request.predictors].map(value => value.guid));
    const groupIds = new Set([...existing.energyUseGroups, ...request.energyUseGroups].map(value => value.guid));
    const meterGroupIds = new Set([...existing.meterGroups, ...request.meterGroups].map(value => value.guid));

    const missingFacility = [
      ...request.meterGroups, ...request.meters, ...request.meterReadings,
      ...request.predictors, ...request.predictorReadings,
      ...request.energyUseGroups, ...request.energyUseEquipment
    ].find(value => !facilityIds.has(value.facilityId));
    if (missingFacility) throw new WorkspaceWriteError('validation-failed', 'An imported record references an unknown facility.');
    if (request.meterReadings.some(value => !meterIds.has(value.meterId))) {
      throw new WorkspaceWriteError('validation-failed', 'An imported meter reading references an unknown meter.');
    }
    if (request.predictorReadings.some(value => !predictorIds.has(value.predictorId))) {
      throw new WorkspaceWriteError('validation-failed', 'An imported predictor reading references an unknown predictor.');
    }
    if (request.energyUseEquipment.some(value => !groupIds.has(value.energyUseGroupId))) {
      throw new WorkspaceWriteError('validation-failed', 'Imported equipment references an unknown energy-use group.');
    }
    if (request.energyUseEquipment.some(value => value.utilityMeterGroupIds.some(id => !meterGroupIds.has(id)))) {
      throw new WorkspaceWriteError('validation-failed', 'Imported equipment references an unknown meter group.');
    }
  }

  private async loadExisting(transaction: IndexedDbTransactionContext): Promise<ExistingImportData> {
    const [facilities, meterGroups, meters, meterReadings, predictors, predictorReadings, energyUseGroups, energyUseEquipment] = await Promise.all([
      transaction.getAll<any>('facilities'), transaction.getAll<any>('utilityMeterGroups'),
      transaction.getAll<any>('utilityMeter'), transaction.getAll<any>('utilityMeterData'),
      transaction.getAll<any>('predictors'), transaction.getAll<any>('predictorData'),
      transaction.getAll<any>('facilityEnergyUseGroups'), transaction.getAll<any>('facilityEnergyUseEquipment')
    ]);
    const accountGuid = this.workspaceStore.account().guid;
    const allCollections = [facilities, meterGroups, meters, meterReadings, predictors, predictorReadings, energyUseGroups, energyUseEquipment];
    const foreignGuids = new Set(allCollections
      .flatMap(collection => collection)
      .filter(value => value.accountId !== accountGuid)
      .map(value => value.guid));
    return {
      facilities: facilities.filter(value => value.accountId === accountGuid),
      meterGroups: meterGroups.filter(value => value.accountId === accountGuid),
      meters: meters.filter(value => value.accountId === accountGuid),
      meterReadings: meterReadings.filter(value => value.accountId === accountGuid),
      predictors: predictors.filter(value => value.accountId === accountGuid),
      predictorReadings: predictorReadings.filter(value => value.accountId === accountGuid),
      energyUseGroups: energyUseGroups.filter(value => value.accountId === accountGuid),
      energyUseEquipment: energyUseEquipment.filter(value => value.accountId === accountGuid),
      foreignGuids
    };
  }

  private async writeEntities<T extends IdbEntry>(
    transaction: IndexedDbTransactionContext,
    store: VerifiStoreName,
    countName: ImportCollectionName,
    values: T[],
    existingValues: T[],
    summary: ImportCommitSummary
  ): Promise<void> {
    const byGuid = new Map(existingValues.map(value => [value.guid, value]));
    for (const original of values) {
      const existing = byGuid.get(original.guid);
      const value = { ...original, modifiedDate: new Date() } as T;
      if (existing) {
        value.id = existing.id;
        await transaction.put(store, value);
        summary.updated[countName]++;
      } else {
        delete value.id;
        await transaction.add(store, value);
        summary.added[countName]++;
      }
    }
  }

  private samePredictorReading(left: IdbPredictorData, right: IdbPredictorData): boolean {
    return left.predictorId === right.predictorId && left.year === right.year && left.month === right.month;
  }

  private entityKey(value: IdbEntry): string {
    return String(value.id ?? value.guid);
  }

  private affectedFacilityGuids(request: ImportCommitRequest): string[] {
    return [...new Set([
      ...request.facilities.map(value => value.guid),
      ...request.meters.map(value => value.facilityId),
      ...request.predictors.map(value => value.facilityId),
      ...request.energyUseGroups.map(value => value.facilityId)
    ].filter(Boolean))];
  }

  private emptyCounts(): ImportEntityCounts {
    return {
      facilities: 0, meterGroups: 0, meters: 0, meterReadings: 0,
      predictors: 0, predictorReadings: 0, energyUseGroups: 0, energyUseEquipment: 0
    };
  }
}

interface ExistingImportData {
  facilities: any[];
  meterGroups: any[];
  meters: any[];
  meterReadings: IdbUtilityMeterData[];
  predictors: any[];
  predictorReadings: IdbPredictorData[];
  energyUseGroups: any[];
  energyUseEquipment: any[];
  foreignGuids: Set<string>;
}
