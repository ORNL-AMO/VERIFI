import { Component, Input } from '@angular/core';
import { FormArray, FormGroup } from '@angular/forms';
import { EditMeterFormService } from '../edit-meter-form.service';
import { getChargeTypes } from './meterChargesOptions';

@Component({
  selector: 'app-meter-charges-form',
  standalone: false,
  templateUrl: './meter-charges-form.component.html',
  styleUrl: './meter-charges-form.component.css'
})
export class MeterChargesFormComponent {
  @Input({ required: true })
  meterForm: FormGroup;

  chargesArray: FormArray;
  chargeTypes: Array<{ value: string, label: string }>;

  constructor(private editMeterFormService: EditMeterFormService) { }

  ngOnChanges() {
    this.chargesArray = this.meterForm.get('chargesArray') as FormArray;
    this.chargeTypes = getChargeTypes(this.meterForm.controls.source.value);
  }

  addCharge() {
    this.editMeterFormService.addCharge(this.meterForm);
    this.meterForm.markAsDirty();
  }

  removeCharge(index: number) {
    this.chargesArray.removeAt(index);
    this.meterForm.markAsDirty();
  }
}
