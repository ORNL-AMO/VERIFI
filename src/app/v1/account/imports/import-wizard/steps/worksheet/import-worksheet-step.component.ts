import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ImportWizardStateService } from '../../import-wizard-state.service';

@Component({
  selector: 'app-import-worksheet-step',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './import-worksheet-step.component.html',
  styleUrls: ['./import-worksheet-step.component.css']
})
export class ImportWorksheetStepComponent {
  readonly state = inject(ImportWizardStateService);
}
