import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FacilityPredictorsWorkspaceService } from './facility-predictors-workspace.service';
import { PredictorWorkspaceActionsService } from './predictor-workspace-actions.service';
import { PredictorWeatherWorkflowService } from './predictor-weather-workflow.service';
import { StandardPredictorActionsService } from './standard-predictor-actions.service';
import { WeatherPredictorActionsService } from './weather-predictor-actions.service';

@Component({
  selector: 'app-facility-predictors',
  templateUrl: './facility-predictors.component.html',
  styleUrls: ['./facility-predictors.component.css'],
  standalone: true,
  imports: [RouterOutlet],
  providers: [
    FacilityPredictorsWorkspaceService,
    PredictorWorkspaceActionsService,
    StandardPredictorActionsService,
    WeatherPredictorActionsService,
    PredictorWeatherWorkflowService
  ]
})
export class FacilityPredictorsComponent { }
