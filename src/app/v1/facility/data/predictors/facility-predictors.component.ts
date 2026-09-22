import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FacilityPredictorsWorkspaceService } from './facility-predictors-workspace.service';

@Component({
  selector: 'app-facility-predictors',
  templateUrl: './facility-predictors.component.html',
  styleUrls: ['./facility-predictors.component.css'],
  standalone: true,
  imports: [RouterOutlet],
  providers: [FacilityPredictorsWorkspaceService]
})
export class FacilityPredictorsComponent { }
