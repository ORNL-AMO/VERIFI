import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ImportWizardStateService } from '../../import-wizard-state.service';

@Component({
  selector: 'app-import-meters-step',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './import-meters-step.component.html',
  styleUrls: ['./import-meters-step.component.css']
})
export class ImportMetersStepComponent {
  readonly state = inject(ImportWizardStateService);
}
