import { MeterSettingsForm } from '../meter-settings-values';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MeterSettingsRuleChange, MeterSettingsViewModel } from '../meter-settings-form.service';

@Component({
  selector: 'app-meter-settings-electricity-form',
  standalone: false,
  styleUrls: ['../meter-settings-form.component.css'],
  templateUrl: './meter-settings-electricity-form.component.html'
})
export class MeterSettingsElectricityFormComponent {
  @Input({ required: true }) form: MeterSettingsForm;
  @Input({ required: true }) viewModel: MeterSettingsViewModel;
  @Output() ruleChange = new EventEmitter<MeterSettingsRuleChange>();
  @Output() immediateChange = new EventEmitter<MeterSettingsRuleChange | undefined>();
  @Output() textChange = new EventEmitter<void>();
}
