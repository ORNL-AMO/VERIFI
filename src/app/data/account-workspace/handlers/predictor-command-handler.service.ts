/**
 * Persistence-only handler for predictor and predictor-data commands.
 *
 * Compound predictor operations use the transaction methods in this handler so
 * predictor settings, monthly data, and analysis references commit together.
 */
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { PredictorDbService } from '@data/indexedDB/predictor-db.service';
import { PredictorDataDbService } from '@data/indexedDB/predictor-data-db.service';
import { IndexedDbTransactionService } from '@data/indexedDB/indexed-db-transaction.service';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbPredictor, isStandardPredictor } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { buildFacilityAnalysesWithoutPredictors } from './analysis-command-handler.service';
import { WorkspaceWriteError } from '../workspace-commands.models';

/** The reviewed, original records. Proposed analysis edits are computed inside the transaction. */
export interface PredictorDeletionPreview {
  readonly facilityGuid: string;
  readonly predictors: readonly IdbPredictor[];
  readonly predictorData: readonly IdbPredictorData[];
  readonly facilityAnalyses: readonly IdbAnalysisItem[];
}

/** Compare snapshots independently of IndexedDB property/record ordering. */
export function predictorDeletionSnapshot(value: unknown): string {
  return JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
}

export interface PredictorDataBatchChanges {
  readonly add: readonly IdbPredictorData[];
  readonly update: readonly IdbPredictorData[];
  readonly delete: readonly IdbPredictorData[];
}

export interface StandardPredictorCreationChanges {
  readonly predictor: IdbPredictor;
  readonly facilityAnalyses: readonly IdbAnalysisItem[];
}

export interface StandardPredictorUpdateChanges extends StandardPredictorCreationChanges { }

export interface StandardPredictorDeletionChanges {
  readonly predictor: IdbPredictor;
  readonly predictorData: readonly IdbPredictorData[];
  readonly facilityAnalyses: readonly IdbAnalysisItem[];
}

export interface WeatherPredictorCreationChanges {
  readonly predictors: readonly IdbPredictor[];
  readonly predictorData: readonly IdbPredictorData[];
  readonly facilityAnalyses: readonly IdbAnalysisItem[];
}

export interface WeatherPredictorUpdateChanges {
  readonly predictor: IdbPredictor;
  readonly predictorData: PredictorDataBatchChanges;
  readonly facilityAnalyses: readonly IdbAnalysisItem[];
}

export interface WeatherStationGroupChanges {
  readonly facilityId: string;
  readonly weatherStationId: string;
  readonly sourceWeatherStationId: string | undefined;
  readonly addPredictors: readonly IdbPredictor[];
  readonly updatePredictors: readonly IdbPredictor[];
  readonly deletePredictors: readonly IdbPredictor[];
  readonly predictorData: PredictorDataBatchChanges;
  readonly facilityAnalyses: readonly IdbAnalysisItem[];
}

export interface WeatherStationMonthChanges extends PredictorDataBatchChanges {
  readonly facilityId: string;
  readonly predictorGuids: readonly string[];
  readonly year: number;
  readonly month: number;
}

@Injectable({ providedIn: 'root' })
export class PredictorCommandHandler {
  constructor(
    private readonly predictorDb: PredictorDbService,
    private readonly predictorDataDb: PredictorDataDbService,
    private readonly transactions: IndexedDbTransactionService
  ) { }

  // ---------------------------------------------------------------------------
  // Predictor
  // ---------------------------------------------------------------------------

  async addPredictor(predictor: IdbPredictor, activeAccountGuid: string): Promise<IdbPredictor> {
    this.assertOwnership(predictor.accountId, activeAccountGuid, 'predictor');
    return firstValueFrom(this.predictorDb.addWithObservable({ ...predictor }));
  }

  async updatePredictor(predictor: IdbPredictor, activeAccountGuid: string): Promise<IdbPredictor> {
    this.assertOwnership(predictor.accountId, activeAccountGuid, 'predictor');
    return firstValueFrom(this.predictorDb.updateWithObservable({ ...predictor }));
  }

  async deletePredictor(predictor: IdbPredictor, activeAccountGuid: string): Promise<number> {
    this.assertOwnership(predictor.accountId, activeAccountGuid, 'predictor');
    await firstValueFrom(this.predictorDb.deleteWithObservable(predictor.id));
    return predictor.id;
  }

  async createStandardPredictor(
    changes: StandardPredictorCreationChanges,
    activeAccountGuid: string
  ): Promise<IdbPredictor> {
    this.assertStandardPredictor(changes.predictor, activeAccountGuid, false);
    this.assertPersistableAnalyses(changes.facilityAnalyses, activeAccountGuid);
    this.assertAnalysisFacility(changes.facilityAnalyses, changes.predictor.facilityId);
    let predictorId: IDBValidKey | undefined;
    await this.transactions.runTransaction(['predictor', 'analysisItems'], 'readwrite', async transaction => {
      predictorId = await transaction.add('predictor', { ...changes.predictor });
      for (const analysis of changes.facilityAnalyses) {
        await transaction.put('analysisItems', { ...analysis, modifiedDate: new Date() });
      }
    });
    return { ...changes.predictor, id: Number(predictorId) };
  }

  async updateStandardPredictor(
    changes: StandardPredictorUpdateChanges,
    activeAccountGuid: string
  ): Promise<IdbPredictor> {
    this.assertStandardPredictor(changes.predictor, activeAccountGuid, true);
    this.assertPersistableAnalyses(changes.facilityAnalyses, activeAccountGuid);
    this.assertAnalysisFacility(changes.facilityAnalyses, changes.predictor.facilityId);
    const updated = { ...changes.predictor, modifiedDate: new Date() };
    await this.transactions.runTransaction(['predictor', 'analysisItems'], 'readwrite', async transaction => {
      await transaction.put('predictor', updated);
      for (const analysis of changes.facilityAnalyses) {
        await transaction.put('analysisItems', { ...analysis, modifiedDate: new Date() });
      }
    });
    return updated;
  }

  async deleteStandardPredictor(
    changes: StandardPredictorDeletionChanges,
    activeAccountGuid: string
  ): Promise<void> {
    this.assertStandardPredictor(changes.predictor, activeAccountGuid, true);
    changes.predictorData.forEach(entry => {
      this.assertPredictorData(entry, changes.predictor.guid, activeAccountGuid);
      if (entry.id === undefined) {
        throw new WorkspaceWriteError('validation-failed', 'Predictor data is missing its IndexedDB id.');
      }
      if (entry.facilityId !== changes.predictor.facilityId) {
        throw new WorkspaceWriteError('validation-failed', 'Predictor data belongs to another facility.');
      }
    });
    this.assertPersistableAnalyses(changes.facilityAnalyses, activeAccountGuid);
    this.assertAnalysisFacility(changes.facilityAnalyses, changes.predictor.facilityId);
    await this.transactions.runTransaction(
      ['predictor', 'predictorData', 'analysisItems'],
      'readwrite',
      async transaction => {
        for (const entry of changes.predictorData) {
          await transaction.deleteByKey('predictorData', entry.id!);
        }
        await transaction.deleteByKey('predictor', changes.predictor.id!);
        for (const analysis of changes.facilityAnalyses) {
          await transaction.put('analysisItems', { ...analysis, modifiedDate: new Date() });
        }
      }
    );
  }

  async deletePredictorsWithData(preview: PredictorDeletionPreview, activeAccountGuid: string): Promise<number> {
    if (!preview.predictors.length) return 0;
    const invalid = () => new WorkspaceWriteError('stale-workspace', 'Predictors, readings, or analyses changed. Review the deletion again.');
    const guids = new Set<string>(), ids = new Set<number>();
    for (const predictor of preview.predictors) {
      this.assertOwnership(predictor.accountId, activeAccountGuid, 'predictor');
      if (!activeAccountGuid || predictor.accountId !== activeAccountGuid || !preview.facilityGuid || predictor.facilityId !== preview.facilityGuid
        || (!isStandardPredictor(predictor) && predictor.predictorType !== 'Weather') || !predictor.guid
        || !Number.isInteger(predictor.id) || predictor.id! <= 0 || guids.has(predictor.guid) || ids.has(predictor.id!)) throw invalid();
      guids.add(predictor.guid); ids.add(predictor.id!);
    }
    const readingIds = new Set<number>();
    for (const reading of preview.predictorData) {
      this.assertOwnership(reading.accountId, activeAccountGuid, 'predictor data');
      if (reading.accountId !== activeAccountGuid || !reading.guid || reading.facilityId !== preview.facilityGuid || !guids.has(reading.predictorId)
        || !Number.isInteger(reading.id) || reading.id! <= 0 || readingIds.has(reading.id!)) throw invalid();
      readingIds.add(reading.id!);
    }
    this.assertPersistableAnalyses(preview.facilityAnalyses, activeAccountGuid);
    this.assertAnalysisFacility(preview.facilityAnalyses, preview.facilityGuid);
    if (preview.facilityAnalyses.some(item => item.accountId !== activeAccountGuid || !Number.isInteger(item.id) || item.id! <= 0)) throw invalid();
    const ordered = <T extends { guid: string }>(records: readonly T[]) => [...records].sort((a, b) => a.guid.localeCompare(b.guid));
    return this.transactions.runTransaction(['predictor', 'predictorData', 'analysisItems'], 'readwrite', async transaction => {
      for (const predictor of preview.predictors) {
        const stored = await transaction.get<IdbPredictor>('predictor', predictor.id!);
        if (!stored || predictorDeletionSnapshot(stored) !== predictorDeletionSnapshot(predictor)) throw invalid();
        const readings = await transaction.getAllByIndex<IdbPredictorData>('predictorData', 'predictorId', predictor.guid);
        const expected = preview.predictorData.filter(reading => reading.predictorId === predictor.guid);
        if (predictorDeletionSnapshot(ordered(readings)) !== predictorDeletionSnapshot(ordered(expected))) throw invalid();
      }
      const analyses = await transaction.getAllByIndex<IdbAnalysisItem>('analysisItems', 'facilityId', preview.facilityGuid);
      if (analyses.some(analysis => analysis.accountId !== activeAccountGuid)
        || predictorDeletionSnapshot(ordered(analyses)) !== predictorDeletionSnapshot(ordered(preview.facilityAnalyses))) throw invalid();
      // Clean the complete GUID set once so edits for different predictors cannot overwrite one another.
      const updated = buildFacilityAnalysesWithoutPredictors(analyses, guids);
      for (const reading of preview.predictorData) await transaction.deleteByKey('predictorData', reading.id!);
      for (const predictor of preview.predictors) await transaction.deleteByKey('predictor', predictor.id!);
      for (let index = 0; index < analyses.length; index++) {
        if (predictorDeletionSnapshot(analyses[index]) !== predictorDeletionSnapshot(updated[index])) {
          await transaction.put('analysisItems', { ...updated[index], modifiedDate: new Date() });
        }
      }
      return preview.predictors.length;
    });
  }

  // ---------------------------------------------------------------------------
  // Predictor data
  // ---------------------------------------------------------------------------

  async addPredictorData(predictorData: IdbPredictorData, activeAccountGuid: string): Promise<IdbPredictorData> {
    this.assertOwnership(predictorData.accountId, activeAccountGuid, 'predictor data');
    return firstValueFrom(this.predictorDataDb.addWithObservable({ ...predictorData }));
  }

  async updatePredictorData(predictorData: IdbPredictorData, activeAccountGuid: string): Promise<IdbPredictorData> {
    this.assertOwnership(predictorData.accountId, activeAccountGuid, 'predictor data');
    return firstValueFrom(this.predictorDataDb.updateWithObservable({ ...predictorData }));
  }

  async deletePredictorData(predictorDataId: number): Promise<number> {
    await firstValueFrom(this.predictorDataDb.deleteIndexWithObservable(predictorDataId));
    return predictorDataId;
  }

  async reconcilePredictorData(
    predictorGuid: string,
    changes: PredictorDataBatchChanges,
    activeAccountGuid: string
  ): Promise<void> {
    changes.add.forEach(entry => this.assertPredictorData(entry, predictorGuid, activeAccountGuid));
    changes.update.forEach(entry => {
      this.assertPredictorData(entry, predictorGuid, activeAccountGuid);
      if (entry.id === undefined) {
        throw new WorkspaceWriteError('validation-failed', 'Predictor data is missing its IndexedDB id.');
      }
    });
    changes.delete.forEach(entry => {
      this.assertPredictorData(entry, predictorGuid, activeAccountGuid);
      if (entry.id === undefined) {
        throw new WorkspaceWriteError('validation-failed', 'Predictor data is missing its IndexedDB id.');
      }
    });

    await this.transactions.runTransaction(['predictorData'], 'readwrite', async transaction => {
      for (const entry of changes.delete) {
        await transaction.deleteByKey('predictorData', entry.id);
      }
      for (const entry of changes.update) {
        await transaction.put('predictorData', { ...entry });
      }
      for (const entry of changes.add) {
        await transaction.add('predictorData', { ...entry });
      }
    });
  }

  async applyWeatherStationMonth(
    changes: WeatherStationMonthChanges,
    activeAccountGuid: string
  ): Promise<void> {
    if (!changes.facilityId || changes.predictorGuids.length === 0
      || !Number.isInteger(changes.year) || changes.year < 1
      || !Number.isInteger(changes.month) || changes.month < 1 || changes.month > 12) {
      throw new WorkspaceWriteError('validation-failed', 'The weather station month change is incomplete.');
    }
    const permitted = new Set(changes.predictorGuids);
    if (permitted.size !== changes.predictorGuids.length) {
      throw new WorkspaceWriteError('validation-failed', 'The weather station predictor list contains duplicates.');
    }
    const recordIds = new Set<number>();
    const assertEntry = (entry: IdbPredictorData, requiresId: boolean): void => {
      this.assertOwnership(entry.accountId, activeAccountGuid, 'predictor data');
      if (entry.facilityId !== changes.facilityId || !permitted.has(entry.predictorId)
        || entry.year !== changes.year || entry.month !== changes.month) {
        throw new WorkspaceWriteError('validation-failed', 'Predictor data is outside the reviewed station month.');
      }
      if (requiresId && entry.id === undefined) {
        throw new WorkspaceWriteError('validation-failed', 'Predictor data is missing its IndexedDB id.');
      }
      if (!requiresId && entry.id !== undefined) {
        throw new WorkspaceWriteError('validation-failed', 'New predictor data already has an IndexedDB id.');
      }
      if (entry.id !== undefined && recordIds.has(entry.id)) {
        throw new WorkspaceWriteError('validation-failed', 'The same predictor-data record was changed more than once.');
      }
      if (entry.id !== undefined) recordIds.add(entry.id);
    };
    changes.add.forEach(entry => assertEntry(entry, false));
    changes.update.forEach(entry => assertEntry(entry, true));
    changes.delete.forEach(entry => assertEntry(entry, true));

    await this.transactions.runTransaction(['predictorData'], 'readwrite', async transaction => {
      for (const entry of changes.delete) await transaction.deleteByKey('predictorData', entry.id);
      for (const entry of changes.update) await transaction.put('predictorData', { ...entry });
      for (const entry of changes.add) await transaction.add('predictorData', { ...entry });
    });
  }

  /**
 * Update predictor data spanning multiple predictors in one transaction.
 * Used by the account-wide weather change check, which must publish once.
 */

  async updateAccountPredictorData(entries: readonly IdbPredictorData[], activeAccountGuid: string): Promise<void> {
    entries.forEach(entry => {
      this.assertOwnership(entry.accountId, activeAccountGuid, 'predictor data');
      if (entry.id === undefined) {
        throw new WorkspaceWriteError('validation-failed', 'Predictor data is missing its IndexedDB id.');
      }
    });
    await this.transactions.runTransaction(['predictorData'], 'readwrite', async transaction => {
      for (const entry of entries) {
        await transaction.put('predictorData', { ...entry });
      }
    });
  }

  async createWeatherPredictors(
    changes: WeatherPredictorCreationChanges,
    activeAccountGuid: string
  ): Promise<void> {
    changes.predictors.forEach(predictor => this.assertOwnership(predictor.accountId, activeAccountGuid, 'predictor'));
    changes.predictorData.forEach(entry => this.assertOwnership(entry.accountId, activeAccountGuid, 'predictor data'));
    changes.facilityAnalyses.forEach(analysis => this.assertOwnership(analysis.accountId, activeAccountGuid, 'facility analysis'));

    const predictorGuids = new Set(changes.predictors.map(predictor => predictor.guid));
    changes.predictorData.forEach(entry => {
      if (!predictorGuids.has(entry.predictorId)) {
        throw new WorkspaceWriteError(
          'validation-failed',
          `Predictor data ${entry.guid} does not belong to a created weather predictor.`
        );
      }
    });

    const persistableAnalyses = changes.facilityAnalyses.map(analysis => ({
      ...analysis,
      modifiedDate: new Date()
    }));

    await this.transactions.runTransaction(['predictor', 'predictorData', 'analysisItems'], 'readwrite', async transaction => {
      for (const predictor of changes.predictors) {
        if (predictor.id === undefined) {
          await transaction.add('predictor', { ...predictor });
        } else {
          await transaction.put('predictor', { ...predictor });
        }
      }
      for (const entry of changes.predictorData) {
        await transaction.add('predictorData', { ...entry });
      }
      for (const analysis of persistableAnalyses) {
        if (analysis.id === undefined) {
          throw new WorkspaceWriteError('validation-failed', 'Facility analysis is missing its IndexedDB id.');
        }
        await transaction.put('analysisItems', analysis);
      }
    });
  }

  async updateWeatherPredictor(
    changes: WeatherPredictorUpdateChanges,
    activeAccountGuid: string
  ): Promise<void> {
    const predictor = changes.predictor;
    this.assertWeatherPredictor(predictor, activeAccountGuid, true);
    changes.predictorData.add.forEach(entry => {
      this.assertPredictorData(entry, predictor.guid, activeAccountGuid);
      this.assertRecordFacility(entry.facilityId, predictor.facilityId, 'Predictor data');
    });
    changes.predictorData.update.forEach(entry => {
      this.assertPredictorData(entry, predictor.guid, activeAccountGuid);
      this.assertRecordFacility(entry.facilityId, predictor.facilityId, 'Predictor data');
      if (entry.id === undefined) throw new WorkspaceWriteError('validation-failed', 'Predictor data is missing its IndexedDB id.');
    });
    changes.predictorData.delete.forEach(entry => {
      this.assertPredictorData(entry, predictor.guid, activeAccountGuid);
      this.assertRecordFacility(entry.facilityId, predictor.facilityId, 'Predictor data');
      if (entry.id === undefined) throw new WorkspaceWriteError('validation-failed', 'Predictor data is missing its IndexedDB id.');
    });
    this.assertPersistableAnalyses(changes.facilityAnalyses, activeAccountGuid);
    this.assertAnalysisFacility(changes.facilityAnalyses, predictor.facilityId);

    await this.transactions.runTransaction(['predictor', 'predictorData', 'analysisItems'], 'readwrite', async transaction => {
      await transaction.put('predictor', { ...predictor, modifiedDate: new Date() });
      for (const entry of changes.predictorData.delete) await transaction.deleteByKey('predictorData', entry.id);
      for (const entry of changes.predictorData.update) await transaction.put('predictorData', { ...entry });
      for (const entry of changes.predictorData.add) await transaction.add('predictorData', { ...entry });
      for (const analysis of changes.facilityAnalyses) {
        await transaction.put('analysisItems', { ...analysis, modifiedDate: new Date() });
      }
    });
  }

  async applyWeatherStationGroup(
    changes: WeatherStationGroupChanges,
    activeAccountGuid: string
  ): Promise<void> {
    if (!changes.facilityId || !changes.weatherStationId) {
      throw new WorkspaceWriteError('validation-failed', 'The reviewed weather station scope is incomplete.');
    }
    changes.addPredictors.forEach(predictor => this.assertWeatherPredictor(predictor, activeAccountGuid, false));
    changes.updatePredictors.forEach(predictor => this.assertWeatherPredictor(predictor, activeAccountGuid, true));
    changes.deletePredictors.forEach(predictor => this.assertWeatherPredictor(predictor, activeAccountGuid, true));
    [...changes.addPredictors, ...changes.updatePredictors].forEach(predictor => {
      this.assertRecordFacility(predictor.facilityId, changes.facilityId, 'Weather predictor');
      if (predictor.weatherStationId !== changes.weatherStationId) {
        throw new WorkspaceWriteError('validation-failed', 'A weather predictor belongs to another station.');
      }
    });
    changes.deletePredictors.forEach(predictor => {
      this.assertRecordFacility(predictor.facilityId, changes.facilityId, 'Weather predictor');
      if (predictor.weatherStationId !== changes.sourceWeatherStationId) {
        throw new WorkspaceWriteError('validation-failed', 'A deleted weather predictor belongs to another station.');
      }
    });

    const retainedPredictorIds = new Set([
      ...changes.addPredictors.map(predictor => predictor.guid),
      ...changes.updatePredictors.map(predictor => predictor.guid)
    ]);
    const deletedPredictorIds = new Set(changes.deletePredictors.map(predictor => predictor.guid));
    changes.predictorData.add.forEach(entry => {
      this.assertOwnership(entry.accountId, activeAccountGuid, 'predictor data');
      this.assertRecordFacility(entry.facilityId, changes.facilityId, 'Predictor data');
      if (!retainedPredictorIds.has(entry.predictorId)) {
        throw new WorkspaceWriteError('validation-failed', 'Added weather data does not belong to the station group.');
      }
    });
    changes.predictorData.update.forEach(entry => {
      this.assertOwnership(entry.accountId, activeAccountGuid, 'predictor data');
      this.assertRecordFacility(entry.facilityId, changes.facilityId, 'Predictor data');
      if (entry.id === undefined || !retainedPredictorIds.has(entry.predictorId)) {
        throw new WorkspaceWriteError('validation-failed', 'Updated weather data is incomplete or outside the station group.');
      }
    });
    changes.predictorData.delete.forEach(entry => {
      this.assertOwnership(entry.accountId, activeAccountGuid, 'predictor data');
      this.assertRecordFacility(entry.facilityId, changes.facilityId, 'Predictor data');
      if (entry.id === undefined || (!retainedPredictorIds.has(entry.predictorId) && !deletedPredictorIds.has(entry.predictorId))) {
        throw new WorkspaceWriteError('validation-failed', 'Deleted weather data is incomplete or outside the station group.');
      }
    });
    this.assertPersistableAnalyses(changes.facilityAnalyses, activeAccountGuid);
    this.assertAnalysisFacility(changes.facilityAnalyses, changes.facilityId);

    await this.transactions.runTransaction(['predictor', 'predictorData', 'analysisItems'], 'readwrite', async transaction => {
      for (const entry of changes.predictorData.delete) await transaction.deleteByKey('predictorData', entry.id);
      for (const predictor of changes.deletePredictors) await transaction.deleteByKey('predictor', predictor.id);
      for (const predictor of changes.updatePredictors) {
        await transaction.put('predictor', { ...predictor, modifiedDate: new Date() });
      }
      for (const predictor of changes.addPredictors) await transaction.add('predictor', { ...predictor });
      for (const entry of changes.predictorData.update) await transaction.put('predictorData', { ...entry });
      for (const entry of changes.predictorData.add) await transaction.add('predictorData', { ...entry });
      for (const analysis of changes.facilityAnalyses) {
        await transaction.put('analysisItems', { ...analysis, modifiedDate: new Date() });
      }
    });
  }

  /**
   * Bulk-replace predictor data for a facility.
   * Deletes all existing entries then inserts the new set.
   * Used by the weather bulk refresh flow.
   */
  async replaceFacilityPredictorData(
    facilityId: string,
    newData: readonly IdbPredictorData[],
    activeAccountGuid: string
  ): Promise<readonly IdbPredictorData[]> {
    newData.forEach(d => this.assertOwnership(d.accountId, activeAccountGuid, 'predictor data'));
    await this.predictorDataDb.deleteAllFacilityPredictorData(facilityId);
    const added: IdbPredictorData[] = [];
    for (const entry of newData) {
      added.push(await firstValueFrom(this.predictorDataDb.addWithObservable({ ...entry })));
    }
    return added;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private assertOwnership(entityAccountGuid: string | undefined, activeAccountGuid: string, label: string): void {
    if (entityAccountGuid && entityAccountGuid !== activeAccountGuid) {
      throw new WorkspaceWriteError(
        'cross-account-entity',
        `${label} belongs to account ${entityAccountGuid}, not the active account ${activeAccountGuid}.`
      );
    }
  }

  private assertWeatherPredictor(
    predictor: IdbPredictor,
    activeAccountGuid: string,
    requireId: boolean
  ): void {
    this.assertOwnership(predictor.accountId, activeAccountGuid, 'weather predictor');
    if (predictor.predictorType !== 'Weather' || (requireId && predictor.id === undefined)) {
      throw new WorkspaceWriteError('validation-failed', 'The station group contains an invalid weather predictor.');
    }
  }

  private assertStandardPredictor(
    predictor: IdbPredictor,
    activeAccountGuid: string,
    requireId: boolean
  ): void {
    this.assertOwnership(predictor.accountId, activeAccountGuid, 'standard predictor');
    const supported = requireId ? isStandardPredictor(predictor) : predictor.predictorType === 'Standard';
    if (!supported || (requireId && predictor.id === undefined)) {
      throw new WorkspaceWriteError('validation-failed', 'The command contains an invalid standard predictor.');
    }
  }

  private assertPersistableAnalyses(
    analyses: readonly IdbAnalysisItem[],
    activeAccountGuid: string
  ): void {
    analyses.forEach(analysis => {
      this.assertOwnership(analysis.accountId, activeAccountGuid, 'facility analysis');
      if (analysis.id === undefined) {
        throw new WorkspaceWriteError('validation-failed', 'Facility analysis is missing its IndexedDB id.');
      }
    });
  }

  private assertAnalysisFacility(
    analyses: readonly IdbAnalysisItem[],
    facilityGuid: string
  ): void {
    if (analyses.some(analysis => analysis.facilityId !== facilityGuid)) {
      throw new WorkspaceWriteError('validation-failed', 'A facility analysis belongs to another facility.');
    }
  }

  private assertRecordFacility(
    recordFacilityGuid: string,
    expectedFacilityGuid: string,
    label: string
  ): void {
    if (recordFacilityGuid !== expectedFacilityGuid) {
      throw new WorkspaceWriteError('validation-failed', `${label} belongs to another facility.`);
    }
  }

  private assertPredictorData(
    predictorData: IdbPredictorData,
    predictorGuid: string,
    activeAccountGuid: string
  ): void {
    this.assertOwnership(predictorData.accountId, activeAccountGuid, 'predictor data');
    if (predictorData.predictorId !== predictorGuid) {
      throw new WorkspaceWriteError(
        'validation-failed',
        `Predictor data ${predictorData.guid} does not belong to predictor ${predictorGuid}.`
      );
    }
  }
}
