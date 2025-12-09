import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { MeterSource } from 'src/app/models/constantsAndTypes';
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
      notes: [equipment.notes],
      equipmentType: [equipment.equipmentType],
      utilityMeterGroupId: [equipment.utilityMeterGroupId]
    });
    equipment.utilityData.forEach((utilityData, index) => {
      this.addUtilityDataToForm(equipmentFormGroup, utilityData.energySource);
    })
    return equipmentFormGroup;
  }

  updateEnergyUseEquipmentFromForm(equipment: IdbFacilityEnergyUseEquipment, form: FormGroup): IdbFacilityEnergyUseEquipment {
    equipment.name = form.controls.name.value;
    equipment.notes = form.controls.notes.value;
    equipment.equipmentType = form.controls.equipmentType.value;
    equipment.utilityMeterGroupId = form.controls.utilityMeterGroupId.value;
    equipment.utilityData.forEach((utilityData, index) => {
      let utilityDataForm = form.controls['utilityData_' + utilityData.energySource.replace(/\s+/g, '_')] as FormGroup;
      utilityData.size = utilityDataForm.controls.size.value;
      utilityData.numberOfEquipment = utilityDataForm.controls.numberOfEquipment.value;
      utilityData.units = utilityDataForm.controls.units.value;
    });
    return equipment;
  }

  addUtilityDataToForm(form: FormGroup, energySource: MeterSource) {
    let utilityDataGroup: FormGroup = this.formBuilder.group({
      size: [undefined, [Validators.required, Validators.min(0)]],
      numberOfEquipment: [1, [Validators.required, Validators.min(1)]],
      units: ['', Validators.required]
    });
    form.addControl('utilityData_' + energySource.replace(/\s+/g, '_'), utilityDataGroup);
  }

  removeUtilityDataFromForm(form: FormGroup, energySource: MeterSource) {
    form.removeControl('utilityData_' + energySource.replace(/\s+/g, '_'));
  }
}
