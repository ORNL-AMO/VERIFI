import { Component, Input, SimpleChanges } from '@angular/core';
import { FormArray, FormGroup } from '@angular/forms';
import { EditMeterFormService } from '../edit-meter-form.service';
import { getChargeTypes } from './meterChargesOptions';
import { MeterSource } from 'src/app/models/constantsAndTypes';

@Component({
  selector: 'app-meter-charges-form',
  standalone: false,
  templateUrl: './meter-charges-form.component.html',
  styleUrl: './meter-charges-form.component.css'
})
export class MeterChargesFormComponent {
  @Input({ required: true })
  meterForm: FormGroup;
  @Input({ required: true })
  meterSource: MeterSource;

  chargesArray: FormArray;
  chargeTypes: Array<{ value: string, label: string }>;

  constructor(private editMeterFormService: EditMeterFormService) { }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['meterForm']) {
      this.chargesArray = this.meterForm.get('chargesArray') as FormArray;
    }
    if (changes['meterSource']) {
      this.chargeTypes = getChargeTypes(this.meterForm.controls.source.value);
      this.checkChargeTypes();
    }
  }

  addCharge() {
    this.editMeterFormService.addCharge(this.meterForm);
    this.meterForm.markAsDirty();
  }

  removeCharge(index: number) {
    this.chargesArray.removeAt(index);
    this.meterForm.markAsDirty();
  }

  checkChargeTypes() {
    this.chargesArray.controls.forEach((charge, index) => {
      const chargeType = charge.get('chargeType');
      if (chargeType && !this.chargeTypes.some(type => type.value === chargeType.value)) {
        chargeType.setValue(null);
        chargeType.updateValueAndValidity();
      }
    });
  }
}
