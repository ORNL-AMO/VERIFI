import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { IconComponent } from '../icons/icon.component';
import { PredictorSettingsForm } from './predictor-settings-form.service';

export type PredictorSettingsSaveState = 'idle' | 'saving' | 'saved' | 'error' | 'invalid';

@Component({
  selector: 'app-predictor-settings-form',
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent],
  templateUrl: './predictor-settings-form.component.html',
  styleUrls: ['./predictor-settings-form.component.css']
})
export class PredictorSettingsFormComponent {
  @Input({ required: true }) form: PredictorSettingsForm;
  @Input() saveState: PredictorSettingsSaveState = 'idle';
  @Input() saveMessage = '';
  @Input() showSaveStatus = true;
  @Input() embedded = false;
  @Output() textChange = new EventEmitter<void>();
  @Output() immediateChange = new EventEmitter<void>();
  @Output() retryRequested = new EventEmitter<void>();
}
