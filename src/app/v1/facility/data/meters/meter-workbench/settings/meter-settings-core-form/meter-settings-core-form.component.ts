import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { MeterSettingsFormService, MeterSettingsRuleChange, MeterSettingsViewModel } from '../meter-settings-form.service';
import type { MeterSettingsSaveState } from '../meter-workbench-settings.component';

@Component({
  selector: 'app-meter-settings-core-form',
  standalone: false,
  styleUrls: ['../meter-workbench-settings.component.css'],
  templateUrl: './meter-settings-core-form.component.html'
})
export class MeterSettingsCoreFormComponent {
  @Input({ required: true }) form: FormGroup;
  @Input({ required: true }) viewModel: MeterSettingsViewModel;
  @Input({ required: true }) saveState: MeterSettingsSaveState;
  @Input({ required: true }) saveMessage: string;
  @Output() ruleChange = new EventEmitter<MeterSettingsRuleChange>();
  @Output() immediateChange = new EventEmitter<MeterSettingsRuleChange | undefined>();
  @Output() textChange = new EventEmitter<void>();

  constructor(private readonly formService: MeterSettingsFormService) { }

  get heatCapacityUnits(): string {
    return `${this.formService.getUnitLabel(this.form.controls.energyUnit.value)}/${this.formService.getUnitLabel(this.form.controls.startingUnit.value)}`;
  }
}
