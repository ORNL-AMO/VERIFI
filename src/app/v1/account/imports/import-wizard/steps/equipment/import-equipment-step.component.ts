import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ImportWizardStateService } from '../../import-wizard-state.service';

@Component({
  selector: 'app-import-equipment-step',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './import-equipment-step.component.html',
  styleUrls: ['./import-equipment-step.component.css']
})
export class ImportEquipmentStepComponent {
  readonly state = inject(ImportWizardStateService);
}
