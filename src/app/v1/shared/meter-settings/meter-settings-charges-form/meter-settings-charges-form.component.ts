import { MeterSettingsForm } from '../meter-settings-values';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MeterSettingsFormService, MeterSettingsRuleChange, MeterSettingsViewModel } from '../meter-settings-form.service';

@Component({
  selector: 'app-meter-settings-charges-form',
  standalone: false,
  styleUrls: ['../meter-settings-form.component.css'],
  templateUrl: './meter-settings-charges-form.component.html'
})
export class MeterSettingsChargesFormComponent {
  @Input({ required: true }) form: MeterSettingsForm;
  @Input({ required: true }) viewModel: MeterSettingsViewModel;
  @Output() immediateChange = new EventEmitter<MeterSettingsRuleChange | undefined>();
  @Output() textChange = new EventEmitter<void>();

  constructor(private readonly formService: MeterSettingsFormService) { }

  get chargesArray() {
    return this.form.controls.chargesArray;
  }

  addCharge(): void {
    this.formService.addCharge(this.form);
    this.form.markAsDirty();
    this.immediateChange.emit('chargeType');
  }

  removeCharge(index: number): void {
    this.formService.removeCharge(this.form, index);
    this.form.markAsDirty();
    this.immediateChange.emit('chargeType');
  }
}
