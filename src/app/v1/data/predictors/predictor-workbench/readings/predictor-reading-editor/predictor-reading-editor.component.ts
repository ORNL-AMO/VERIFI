import { Component, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';
import { PredictorReadingEditorMode, PredictorReadingSaveRequest } from '../../../models';
import { PredictorReadingForm, PredictorReadingFormService } from '../predictor-reading-form.service';

@Component({
  selector: 'app-predictor-reading-editor',
  templateUrl: './predictor-reading-editor.component.html',
  styleUrls: ['./predictor-reading-editor.component.css'],
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent, WorkspaceSlideoutComponent]
})
export class PredictorReadingEditorComponent implements OnChanges {
  private readonly formService = inject(PredictorReadingFormService);

  @Input({ required: true }) predictor!: IdbPredictor;
  @Input({ required: true }) reading!: IdbPredictorData;
  @Input({ required: true }) mode!: PredictorReadingEditorMode;
  @Input() existingReadings: readonly IdbPredictorData[] = [];
  @Input() saving = false;
  @Input() error?: string;
  @Output() saved = new EventEmitter<PredictorReadingSaveRequest>();
  @Output() cancelled = new EventEmitter<void>();

  form?: PredictorReadingForm;
  isCalculatedWeather = false;

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['predictor'] || changes['reading'] || changes['mode'] || changes['existingReadings'])
      && this.predictor && this.reading && this.mode) {
      this.form = this.formService.build(this.predictor, this.reading, this.existingReadings, this.mode);
      this.isCalculatedWeather = this.predictor.predictorType === 'Weather'
        && this.mode === 'edit'
        && !this.reading.weatherOverride;
    }
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardSave(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      this.save(false);
    }
  }

  setManually(): void {
    if (!this.form || this.saving) return;
    this.formService.setManualOverride(this.form);
    this.isCalculatedWeather = false;
  }

  save(addAnother: boolean): void {
    if (!this.form || this.form.invalid || this.saving) {
      this.form?.markAllAsTouched();
      return;
    }
    this.saved.emit({
      reading: this.formService.updateReading(this.reading, this.predictor, this.form),
      addAnother
    });
  }
}
