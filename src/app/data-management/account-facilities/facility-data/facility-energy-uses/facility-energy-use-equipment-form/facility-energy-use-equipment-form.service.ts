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
      this.addUtilityDataToForm(equipmentFormGroup, utilityData.energySource, utilityData.numberOfEquipment, utilityData.size, utilityData.units);
    })
    return equipmentFormGroup;
  }

  updateEnergyUseEquipmentFromForm(equipment: IdbFacilityEnergyUseEquipment, form: FormGroup): IdbFacilityEnergyUseEquipment {
    equipment.name = form.controls.name.value;
    equipment.notes = form.controls.notes.value;
    equipment.equipmentType = form.controls.equipmentType.value;
    equipment.utilityMeterGroupId = form.controls.utilityMeterGroupId.value;
    //update utility data
    let includedSources: Array<MeterSource> = [];
    Object.keys(form.controls).forEach(controlName => {
      if (controlName.startsWith('utilityData_')) {
        let source: MeterSource = controlName.replace('utilityData_', '').replace(/_/g, ' ') as MeterSource;
        includedSources.push(source);
      }
    });
    //remove any utility data not included
    equipment.utilityData = equipment.utilityData.filter(utilityData => {
      return includedSources.includes(utilityData.energySource);
    });
    //add any new utility data
    includedSources.forEach(source => {
      let existingUtilityData = equipment.utilityData.find(utilityData => { return utilityData.energySource == source; });
      if (!existingUtilityData) {
        equipment.utilityData.push({
          energySource: source,
          size: 0,
          numberOfEquipment: 1,
          units: ''
        });
      }
    });
    //update utility data values from form
    for (let i = 0; i < equipment.utilityData.length; i++) {
      let utilityDataForm = form.controls['utilityData_' + equipment.utilityData[i].energySource.replace(/\s+/g, '_')] as FormGroup;
      equipment.utilityData[i].size = utilityDataForm.controls.size.value;
      equipment.utilityData[i].numberOfEquipment = utilityDataForm.controls.numberOfEquipment.value;
      equipment.utilityData[i].units = utilityDataForm.controls.units.value;
    }
    return equipment;
  }

  addUtilityDataToForm(form: FormGroup, energySource: MeterSource, numberOfEquipment: number = 1, size: number = undefined, units: string = '') {
    let utilityDataGroup: FormGroup = this.formBuilder.group({
      size: [size, [Validators.required, Validators.min(0)]],
      numberOfEquipment: [numberOfEquipment, [Validators.required, Validators.min(1)]],
      units: [units, Validators.required]
    });
    form.addControl('utilityData_' + energySource.replace(/\s+/g, '_'), utilityDataGroup);
  }

  removeUtilityDataFromForm(form: FormGroup, energySource: MeterSource) {
    form.removeControl('utilityData_' + energySource.replace(/\s+/g, '_'));
  }
}
