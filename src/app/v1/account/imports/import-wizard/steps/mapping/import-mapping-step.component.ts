import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ImportMappingType, ImportWizardStateService } from '../../import-wizard-state.service';

@Component({
  selector: 'app-import-mapping-step',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './import-mapping-step.component.html',
  styleUrls: ['./import-mapping-step.component.css']
})
export class ImportMappingStepComponent {
  readonly state = inject(ImportWizardStateService);
  readonly mappingType = inject(ActivatedRoute).snapshot.data['mappingType'] as ImportMappingType;
  readonly title = this.mappingType === 'meter' ? 'meter' : 'predictor';
}
