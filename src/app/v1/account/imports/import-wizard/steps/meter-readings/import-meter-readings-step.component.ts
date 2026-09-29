import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ImportWizardStateService } from '../../import-wizard-state.service';

@Component({
  selector: 'app-import-meter-readings-step',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './import-meter-readings-step.component.html',
  styleUrls: ['./import-meter-readings-step.component.css']
})
export class ImportMeterReadingsStepComponent {
  readonly state = inject(ImportWizardStateService);
}
