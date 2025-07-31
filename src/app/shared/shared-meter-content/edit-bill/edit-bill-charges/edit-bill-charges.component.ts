import { Component, Input } from '@angular/core';
import { FormArray, FormGroup } from '@angular/forms';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';

@Component({
  selector: 'app-edit-bill-charges',
  standalone: false,
  templateUrl: './edit-bill-charges.component.html',
  styleUrl: './edit-bill-charges.component.css'
})
export class EditBillChargesComponent {
  @Input()
  editMeterData: IdbUtilityMeterData;
  @Input()
  addOrEdit: 'add' | 'edit';
  @Input()
  meterDataForm: FormGroup;
  @Input()
  editMeter: IdbUtilityMeter;

  chargesArray: FormArray;

  ngOnChanges() {
    this.chargesArray = this.meterDataForm.get('chargesArray') as FormArray;
  }


}
