import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IdbFacilityEnergyUseEquipment } from 'src/app/models/idbModels/facilityEnergyUseEquipment';

@Injectable({
  providedIn: 'root'
})
export class FacilityEnergyUseEquipmentFormService {
  
  constructor(private formBuilder: FormBuilder) { }

  getFormFromEnergyUseEquipment(equipment: IdbFacilityEnergyUseEquipment): FormGroup {
    let equipmentFormGroup: FormGroup = this.formBuilder.group({
      name: [equipment.name, Validators.required],
      size: [equipment.size, Validators.required],
      units: [equipment.units, Validators.required],
      energySource: [equipment.energySource, Validators.required]
    });
    return equipmentFormGroup;
  }

  updateEnergyUseEquipmentFromForm(equipment: IdbFacilityEnergyUseEquipment, form: FormGroup): IdbFacilityEnergyUseEquipment {
    equipment.name = form.controls.name.value;
    equipment.size = form.controls.size.value;
    equipment.units = form.controls.units.value;
    equipment.energySource = form.controls.energySource.value;
    return equipment;
  }
}
