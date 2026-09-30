import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ImportWizardStateService } from '../../import-wizard-state.service';
import {
  ImportPredictorEditorComponent,
  ImportPredictorEditResult
} from './import-predictor-editor/import-predictor-editor.component';

@Component({
  selector: 'app-import-predictors-step',
  standalone: true,
  imports: [CommonModule, FormsModule, ImportPredictorEditorComponent],
  templateUrl: './import-predictors-step.component.html',
  styleUrls: ['./import-predictors-step.component.css']
})
export class ImportPredictorsStepComponent {
  readonly state = inject(ImportWizardStateService);
  readonly invalidIncludedCount = computed(() => this.state.predictorRows()
    .filter(row => !row.valid && !row.predictor.skipImport).length);
  readonly editingIndex = signal<number | undefined>(undefined);
  readonly editingRow = computed(() => {
    const index = this.editingIndex();
    return index === undefined ? undefined : this.state.predictorRows().find(row => row.index === index);
  });
  readonly editingFacility = computed(() => {
    const row = this.editingRow();
    return row
      ? this.state.draft().importFacilities.find(facility => facility.guid === row.predictor.facilityId)
      : undefined;
  });
  readonly existingPredictorOptions = computed(() => {
    const index = this.editingIndex();
    return index === undefined ? [] : this.state.availableExistingPredictors(index);
  });

  openEditor(index: number): void { this.editingIndex.set(index); }
  closeEditor(): void { this.editingIndex.set(undefined); }
  savePredictor(result: ImportPredictorEditResult): void {
    this.state.savePredictor(result.originalGuid, result.predictor);
    this.closeEditor();
  }
}
