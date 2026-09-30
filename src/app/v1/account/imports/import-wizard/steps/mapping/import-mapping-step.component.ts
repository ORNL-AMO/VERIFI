import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { ImportMappingType } from '../../import-mapping.models';
import { ImportWizardStateService } from '../../import-wizard-state.service';
import { ImportMappingLaneComponent } from './import-mapping-lane/import-mapping-lane.component';

@Component({
  selector: 'app-import-mapping-step',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, ImportMappingLaneComponent],
  templateUrl: './import-mapping-step.component.html',
  styleUrls: ['./import-mapping-step.component.css']
})
export class ImportMappingStepComponent {
  readonly state = inject(ImportWizardStateService);
  readonly mappingType = inject(ActivatedRoute).snapshot.data['mappingType'] as ImportMappingType;
  readonly board = computed(() => this.state.mappingBoard(this.mappingType));
  readonly title = this.mappingType === 'meter' ? 'meter' : 'predictor';
}
