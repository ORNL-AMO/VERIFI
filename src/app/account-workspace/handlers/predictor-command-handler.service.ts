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
import { IdbPredictor } from '../../models/idbModels/predictor';
import { IdbPredictorData } from '../../models/idbModels/predictorData';
import { WorkspaceWriteError } from '../workspace-commands.models';

@Injectable({ providedIn: 'root' })
export class PredictorCommandHandler {
  constructor(
    private readonly predictorDb: PredictorDbService,
    private readonly predictorDataDb: PredictorDataDbService
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
}
