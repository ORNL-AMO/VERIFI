import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ImportWizardStateService } from '../../import-wizard-state.service';

@Component({
  selector: 'app-import-columns-step',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './import-columns-step.component.html',
  styleUrls: ['./import-columns-step.component.css']
})
export class ImportColumnsStepComponent {
  readonly state = inject(ImportWizardStateService);
}
