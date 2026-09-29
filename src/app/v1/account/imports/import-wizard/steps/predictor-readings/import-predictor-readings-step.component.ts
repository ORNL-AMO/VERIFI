import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ImportWizardStateService } from '../../import-wizard-state.service';

@Component({
  selector: 'app-import-predictor-readings-step',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './import-predictor-readings-step.component.html',
  styleUrls: ['./import-predictor-readings-step.component.css']
})
export class ImportPredictorReadingsStepComponent {
  readonly state = inject(ImportWizardStateService);
}
