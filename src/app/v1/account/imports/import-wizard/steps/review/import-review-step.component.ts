import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ImportWizardStateService } from '../../import-wizard-state.service';

@Component({
  selector: 'app-import-review-step',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './import-review-step.component.html',
  styleUrls: ['./import-review-step.component.css']
})
export class ImportReviewStepComponent {
  readonly state = inject(ImportWizardStateService);
}
