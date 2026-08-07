/**
 * Persistence-only handler for predictor and predictor-data commands.
 *
 * Weather bulk refresh is coordinated by WeatherPredictorManagementService
 * (migrated in a later commit); this handler exposes the lower-level CRUD
 * primitives consumed by that service and by direct data-entry components.
 */
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { PredictorDbService } from '../../indexedDB/predictor-db.service';
import { PredictorDataDbService } from '../../indexedDB/predictor-data-db.service';
import { IndexedDbTransactionService } from '../../indexedDB/indexed-db-transaction.service';
import { IdbAnalysisItem } from '../../models/idbModels/analysisItem';
import { IdbPredictor } from '../../models/idbModels/predictor';
import { IdbPredictorData } from '../../models/idbModels/predictorData';
import { WorkspaceWriteError } from '../workspace-commands.models';

export interface PredictorDataBatchChanges {
  readonly add: readonly IdbPredictorData[];
  readonly update: readonly IdbPredictorData[];
  readonly delete: readonly IdbPredictorData[];
}

export interface WeatherPredictorCreationChanges {
  readonly predictors: readonly IdbPredictor[];
  readonly predictorData: readonly IdbPredictorData[];
  readonly facilityAnalyses: readonly IdbAnalysisItem[];
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
        await transaction.add('predictor', { ...predictor });
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
