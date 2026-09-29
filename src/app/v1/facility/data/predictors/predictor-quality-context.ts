import { InjectionToken, Signal } from '@angular/core';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { StatusItem } from '@app/v1/status/status.models';

export interface PredictorQualityContext {
  readonly predictor: Signal<IdbPredictor | undefined>;
  readonly readings: Signal<readonly IdbPredictorData[]>;
  readonly findings: Signal<readonly StatusItem[]>;
  readonly idPrefix: Signal<string>;
  readonly settingsLabel: string;
  openReadings(): void;
  openSettings(): void;
}

export const PREDICTOR_QUALITY_CONTEXT = new InjectionToken<PredictorQualityContext>(
  'PREDICTOR_QUALITY_CONTEXT'
);
