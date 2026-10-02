import { Component, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { FacilityAnalysisRegressionController } from '../facility-analysis-regression.controller';
import { FacilityAnalysisRegressionFacade } from '../facility-analysis-regression.facade';

@Component({
  selector: 'app-regression-method-control',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './regression-method-control.component.html',
  styleUrls: ['./regression-method-control.component.css']
})
export class RegressionMethodControlComponent {
  readonly controller = inject(FacilityAnalysisRegressionController);
  readonly generating = inject(FacilityAnalysisRegressionFacade).generating;
}
