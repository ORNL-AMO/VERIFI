import { Injectable, inject } from '@angular/core';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { PredictorDraft, PredictorMissingMonth } from './models';
import { PredictorWorkspaceActionsService } from './predictor-workspace-actions.service';
import { StandardPredictorSettings, StandardPredictorSettingsIdentity } from './models/standard-predictor-settings.models';

/** Standard-predictor command surface used by dashboard, settings, and reading editors. */
@Injectable()
export class StandardPredictorActionsService {
  private readonly actions = inject(PredictorWorkspaceActionsService);

  createPredictor(draft: PredictorDraft): Promise<IdbPredictor> {
    return this.actions.createPredictor(draft);
  }

  updateSettings(identity: StandardPredictorSettingsIdentity, value: StandardPredictorSettings,
    base: StandardPredictorSettings, ownerId: string): Promise<StandardPredictorSettings> {
    return this.actions.updateSettings(identity, value, base, ownerId);
  }

  copyPredictor(predictor: IdbPredictor): Promise<IdbPredictor> {
    return this.actions.copyPredictor(predictor);
  }

  deletePredictor(predictor: IdbPredictor): Promise<void> {
    return this.actions.deletePredictor(predictor);
  }

  addPredictorReading(reading: IdbPredictorData): Promise<IdbPredictorData> {
    return this.actions.addPredictorReading(reading);
  }

  updatePredictorReading(reading: IdbPredictorData): Promise<IdbPredictorData> {
    return this.actions.updatePredictorReading(reading);
  }

  deletePredictorReading(reading: IdbPredictorData): Promise<void> {
    return this.actions.deletePredictorReading(reading);
  }

  deletePredictorReadings(predictorGuid: string, readings: readonly IdbPredictorData[]): Promise<void> {
    return this.actions.deletePredictorReadings(predictorGuid, readings);
  }

  fillMissingPredictorMonths(
    predictorGuid: string,
    months: readonly PredictorMissingMonth[]
  ): Promise<readonly IdbPredictorData[]> {
    return this.actions.fillMissingPredictorMonths(predictorGuid, months);
  }
}
