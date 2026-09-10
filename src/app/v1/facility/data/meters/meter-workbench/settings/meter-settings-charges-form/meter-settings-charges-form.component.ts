import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormArray, FormGroup } from '@angular/forms';
import { MeterSettingsFormService, MeterSettingsRuleChange, MeterSettingsViewModel } from '../meter-settings-form.service';

@Component({
  selector: 'app-meter-settings-charges-form',
  standalone: false,
  styleUrls: ['../meter-workbench-settings.component.css'],
  templateUrl: './meter-settings-charges-form.component.html'
})
export class MeterSettingsChargesFormComponent {
  @Input({ required: true }) form: FormGroup;
  @Input({ required: true }) viewModel: MeterSettingsViewModel;
  @Output() immediateChange = new EventEmitter<MeterSettingsRuleChange | undefined>();
  @Output() textChange = new EventEmitter<void>();

  constructor(private readonly formService: MeterSettingsFormService) { }

  get chargesArray(): FormArray {
    return this.form.get('chargesArray') as FormArray;
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
