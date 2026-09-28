import { Provider } from '@angular/core';
import { FacilityPredictorsWorkspaceService } from './facility-predictors-workspace.service';
import { PredictorWeatherWorkflowService } from './predictor-weather-workflow.service';
import { PredictorWorkspaceActionsService } from './predictor-workspace-actions.service';
import { StandardPredictorActionsService } from './standard-predictor-actions.service';
import { WeatherPredictorActionsService } from './weather-predictor-actions.service';

/** Providers shared by the Predictor dashboard and every child workbench route. */
export const FACILITY_PREDICTORS_WORKSPACE_PROVIDERS: Provider[] = [
  FacilityPredictorsWorkspaceService,
  PredictorWorkspaceActionsService,
  StandardPredictorActionsService,
  WeatherPredictorActionsService,
  PredictorWeatherWorkflowService
];
