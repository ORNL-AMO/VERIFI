import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { METER_CALENDARIZATION_METHODS } from '@app/v1/facility/data/meters/facility-meters.models';
import { MeterSettingsRuleChange, MeterSettingsViewModel } from '../meter-settings-form.service';

@Component({
  selector: 'app-meter-settings-reading-form',
  standalone: false,
  styleUrls: ['../meter-workbench-settings.component.css'],
  templateUrl: './meter-settings-reading-form.component.html'
})
export class MeterSettingsReadingFormComponent {
  @Input({ required: true }) form: FormGroup;
  @Input({ required: true }) viewModel: MeterSettingsViewModel;
  @Input() meterDataExists = false;
  @Output() immediateChange = new EventEmitter<MeterSettingsRuleChange | undefined>();
  @Output() calendarizationHelpRequested = new EventEmitter<void>();
  readonly calendarizationMethods = METER_CALENDARIZATION_METHODS;
}
