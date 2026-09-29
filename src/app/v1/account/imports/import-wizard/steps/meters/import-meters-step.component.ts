import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ImportWizardStateService } from '../../import-wizard-state.service';
import { METER_CALENDARIZATION_METHODS } from '@app/v1/shared/meter-settings/meter-calendarization-options';
import { ImportMeterEditorComponent, ImportMeterEditResult } from './import-meter-editor/import-meter-editor.component';

@Component({
  selector: 'app-import-meters-step',
  standalone: true,
  imports: [CommonModule, FormsModule, ImportMeterEditorComponent],
  templateUrl: './import-meters-step.component.html',
  styleUrls: ['./import-meters-step.component.css']
})
export class ImportMetersStepComponent {
  readonly state = inject(ImportWizardStateService);
  readonly calendarizationMethods = METER_CALENDARIZATION_METHODS;
  readonly invalidIncludedCount = computed(() => this.state.meterRows()
    .filter(row => !row.valid && !row.meter.skipImport).length);
  readonly account = computed(() => this.state.workspace.account());
  readonly editingIndex = signal<number | undefined>(undefined);
  readonly editingRow = computed(() => {
    const index = this.editingIndex();
    return index === undefined ? undefined : this.state.meterRows().find(row => row.index === index);
  });
  readonly editingFacility = computed(() => {
    const row = this.editingRow();
    return row ? this.state.draft().importFacilities.find(facility => facility.guid === row.meter.facilityId) : undefined;
  });
  readonly existingMeterOptions = computed(() => {
    const index = this.editingIndex();
    return index === undefined ? [] : this.state.availableExistingMeters(index);
  });
  readonly meterGuidsWithReadings = computed(() => [
    ...new Set(this.state.workspace.meterData().map(reading => reading.meterId))
  ]);

  openEditor(index: number): void {
    this.editingIndex.set(index);
  }

  closeEditor(): void {
    this.editingIndex.set(undefined);
  }

  saveMeter(result: ImportMeterEditResult): void {
    this.state.saveMeter(result.originalGuid, result.meter);
    this.closeEditor();
  }
}
