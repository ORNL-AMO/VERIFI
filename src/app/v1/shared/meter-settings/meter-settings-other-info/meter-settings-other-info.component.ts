import { MeterSettingsForm } from '../meter-settings-values';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-meter-settings-other-info',
  standalone: false,
  styleUrls: ['../meter-settings-form.component.css'],
  templateUrl: './meter-settings-other-info.component.html'
})
export class MeterSettingsOtherInfoComponent {
  @Input({ required: true }) form: MeterSettingsForm;
  @Output() textChange = new EventEmitter<void>();
}
