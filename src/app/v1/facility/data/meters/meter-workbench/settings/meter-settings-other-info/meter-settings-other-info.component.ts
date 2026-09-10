import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Component({
  selector: 'app-meter-settings-other-info',
  standalone: false,
  styleUrls: ['../meter-workbench-settings.component.css'],
  templateUrl: './meter-settings-other-info.component.html'
})
export class MeterSettingsOtherInfoComponent {
  @Input({ required: true }) form: FormGroup;
  @Output() textChange = new EventEmitter<void>();
}
