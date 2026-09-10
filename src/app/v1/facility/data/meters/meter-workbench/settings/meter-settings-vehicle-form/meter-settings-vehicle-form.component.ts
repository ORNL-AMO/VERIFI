import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { MeterSettingsRuleChange, MeterSettingsViewModel } from '../meter-settings-form.service';

@Component({
  selector: 'app-meter-settings-vehicle-form',
  standalone: false,
  styleUrls: ['../meter-workbench-settings.component.css'],
  templateUrl: './meter-settings-vehicle-form.component.html'
})
export class MeterSettingsVehicleFormComponent {
  @Input({ required: true }) form: FormGroup;
  @Input({ required: true }) viewModel: MeterSettingsViewModel;
  @Output() ruleChange = new EventEmitter<MeterSettingsRuleChange>();
  @Output() immediateChange = new EventEmitter<MeterSettingsRuleChange | undefined>();
  @Output() textChange = new EventEmitter<void>();
}
