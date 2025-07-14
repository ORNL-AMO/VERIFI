import { Component, Input } from '@angular/core';
import { FormArray, FormGroup } from '@angular/forms';
import { EditMeterFormService } from '../edit-meter-form.service';
import { ChargesTypes, MeterChargeType } from './meterChargesOptions';
import { getChargeTypeUnitOptions } from './charges-unit-options.pipe';

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
  chargeTypes: Array<{ value: string, label: string }> = ChargesTypes;

  constructor(private editMeterFormService: EditMeterFormService) { }

  ngOnChanges() {
    this.chargesArray = this.meterForm.get('chargesArray') as FormArray;
  }

  addCharge() {
    this.editMeterFormService.addCharge(this.meterForm);
  }

  removeCharge(index: number) {
    this.chargesArray.removeAt(index);
    this.meterForm.markAsDirty();
  }

  updateChargeUnit(index: number) {
    let chargeGroup: FormGroup = this.chargesArray.at(index) as FormGroup;
    let chargeType: MeterChargeType = chargeGroup.get('chargeType').value;
    let unitOptions = getChargeTypeUnitOptions(chargeType);
    if (unitOptions.find(option => option.value === chargeGroup.get('chargeUnit').value) === undefined) {
      chargeGroup.get('chargeUnit').setValue(unitOptions[0].value);
    }
  }
}
