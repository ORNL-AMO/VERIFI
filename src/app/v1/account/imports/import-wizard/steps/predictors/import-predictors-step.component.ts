import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ImportWizardStateService } from '../../import-wizard-state.service';

@Component({
  selector: 'app-import-predictors-step',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './import-predictors-step.component.html',
  styleUrls: ['./import-predictors-step.component.css']
})
export class ImportPredictorsStepComponent {
  readonly state = inject(ImportWizardStateService);
}
