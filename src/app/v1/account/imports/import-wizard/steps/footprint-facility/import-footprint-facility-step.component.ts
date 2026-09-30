import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ImportWizardStateService } from '../../import-wizard-state.service';

@Component({
  selector: 'app-import-footprint-facility-step',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './import-footprint-facility-step.component.html',
  styleUrls: ['./import-footprint-facility-step.component.css']
})
export class ImportFootprintFacilityStepComponent {
  readonly state = inject(ImportWizardStateService);
}
