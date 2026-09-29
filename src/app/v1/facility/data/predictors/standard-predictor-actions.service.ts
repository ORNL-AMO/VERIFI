import { Injectable, inject } from '@angular/core';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { PredictorDraft, PredictorMissingMonth } from './models';
import { PredictorWorkspaceActionsService } from './predictor-workspace-actions.service';

/** Standard-predictor command surface used by dashboard, settings, and reading editors. */
@Injectable()
export class StandardPredictorActionsService {
  private readonly actions = inject(PredictorWorkspaceActionsService);

  createPredictor(draft: PredictorDraft): Promise<IdbPredictor> {
    return this.actions.createPredictor(draft);
  }

  updatePredictor(predictor: IdbPredictor): Promise<IdbPredictor> {
    return this.actions.updatePredictor(predictor);
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
