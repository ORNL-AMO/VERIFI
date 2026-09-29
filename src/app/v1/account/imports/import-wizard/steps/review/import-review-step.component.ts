import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { ImportWizardStateService } from '../../import-wizard-state.service';

@Component({
  selector: 'app-import-review-step',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './import-review-step.component.html',
  styleUrls: ['./import-review-step.component.css']
})
export class ImportReviewStepComponent {
  readonly state = inject(ImportWizardStateService);
}
