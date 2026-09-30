import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ImportWizardStateService } from '../../import-wizard-state.service';

@Component({
  selector: 'app-import-facilities-step',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './import-facilities-step.component.html',
  styleUrls: ['./import-facilities-step.component.css']
})
export class ImportFacilitiesStepComponent {
  readonly state = inject(ImportWizardStateService);
}
