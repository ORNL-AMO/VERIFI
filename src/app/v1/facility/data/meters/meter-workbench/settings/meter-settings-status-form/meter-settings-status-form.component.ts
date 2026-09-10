import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { MeterSettingsRuleChange, MeterSettingsViewModel } from '../meter-settings-form.service';

@Component({
  selector: 'app-meter-settings-status-form',
  standalone: false,
  styleUrls: ['../meter-workbench-settings.component.css'],
  templateUrl: './meter-settings-status-form.component.html'
})
export class MeterSettingsStatusFormComponent {
  @Input({ required: true }) form: FormGroup;
  @Input({ required: true }) viewModel: MeterSettingsViewModel;
  @Output() immediateChange = new EventEmitter<MeterSettingsRuleChange | undefined>();
  @Output() textChange = new EventEmitter<void>();
}
