import { MeterSettingsForm } from './meter-settings-values';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  MeterSettingsRuleChange,
  MeterSettingsGroupingView,
  MeterSettingsSaveState,
  MeterSettingsViewModel
} from './meter-settings-form.service';

export type MeterSettingsFormLayout = 'two-column' | 'single-column';

@Component({
  selector: 'app-meter-settings-form',
  standalone: false,
  templateUrl: './meter-settings-form.component.html',
  styleUrls: ['./meter-settings-form.component.css']
})
export class MeterSettingsFormComponent {
  @Input({ required: true }) form: MeterSettingsForm;
  @Input({ required: true }) viewModel: MeterSettingsViewModel;
  @Input() meterDataExists = false;
  @Input() setupValuesUnlocked = false;
  @Input() canUnlockSetup = true;
  @Input() showSetupUnlockControl = true;
  @Input() saveState: MeterSettingsSaveState = 'idle';
  @Input() saveMessage = '';
  @Input() showCalendarizationHelp = true;
  @Input() layout: MeterSettingsFormLayout = 'two-column';
  @Input() grouping?: MeterSettingsGroupingView;

  @Output() ruleChange = new EventEmitter<MeterSettingsRuleChange>();
  @Output() immediateChange = new EventEmitter<MeterSettingsRuleChange | undefined>();
  @Output() textChange = new EventEmitter<void>();
  @Output() calendarizationHelpRequested = new EventEmitter<void>();
  @Output() setupUnlockRequested = new EventEmitter<void>();
}
