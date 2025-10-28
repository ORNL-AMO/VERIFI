import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { IdbFacilityEnergyUseEquipment } from 'src/app/models/idbModels/facilityEnergyUseEquipment';

@Injectable({
  providedIn: 'root'
})
export class FacilityEnergyUseEquipmentFormService {
  
  constructor(private formBuilder: FormBuilder) { }

  getFormFromEnergyUseEquipment(equipment: IdbFacilityEnergyUseEquipment, inSetup: boolean): FormGroup {
    let requiredValidators: Array<ValidatorFn> = [];
    if (!inSetup) {
      requiredValidators.push(Validators.required);
    }
    let equipmentFormGroup: FormGroup = this.formBuilder.group({
      name: [equipment.name, Validators.required],
      size: [equipment.size, requiredValidators],
      units: [equipment.units, requiredValidators],
      energySource: [equipment.energySource, requiredValidators],
      notes: [equipment.notes],
      equipmentType: [equipment.equipmentType],
    });
    return equipmentFormGroup;
  }

  updateEnergyUseEquipmentFromForm(equipment: IdbFacilityEnergyUseEquipment, form: FormGroup): IdbFacilityEnergyUseEquipment {
    equipment.name = form.controls.name.value;
    equipment.size = form.controls.size.value;
    equipment.units = form.controls.units.value;
    equipment.energySource = form.controls.energySource.value;
    equipment.notes = form.controls.notes.value;
    equipment.equipmentType = form.controls.equipmentType.value;
    return equipment;
  }
}
