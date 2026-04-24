import { Component, Input } from '@angular/core';
import { PredictorStatusCheck } from 'src/app/calculations/status-check-calculations/predictorStatusCheck';

@Component({
  selector: 'app-predictors-status-check',
  standalone: false,
  templateUrl: './predictors-status-check.component.html',
  styleUrl: './predictors-status-check.component.css'
})
export class PredictorsStatusCheckComponent {
  @Input({ required: true }) predictorsStatusChecks: Array<PredictorStatusCheck>;
    @Input({ required: true }) predictorsStatus: 'good' | 'warning' | 'error';
}
