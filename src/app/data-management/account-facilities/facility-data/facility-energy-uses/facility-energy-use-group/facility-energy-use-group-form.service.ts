import { Injectable } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EnergyUseGroupEquipment, IdbFacilityEnergyUseGroup } from 'src/app/models/idbModels/facilityEnergyUseGroups';

@Injectable({
  providedIn: 'root'
})
export class FacilityEnergyUseGroupFormService {

  constructor(private formBuilder: FormBuilder) { }

  getFormFromEnergyUseGroup(group: IdbFacilityEnergyUseGroup): FormGroup {
    let formGroup: FormGroup = this.formBuilder.group({
      name: [group.name, Validators.required],
      equipmentItems: this.formBuilder.array([])
    });

    // group.equipmentItems.forEach(item => {
    //   let equipmentFormGroup: FormGroup = this.getEquipmentFormFromItem(item);
    //   (formGroup.get('equipmentItems') as FormArray).push(equipmentFormGroup);
    // })
    return formGroup;
  }

  // getEquipmentFormFromItem(item: EnergyUseGroupEquipment): FormGroup {
  //   let equipmentFormGroup: FormGroup = this.formBuilder.group({
  //     id: [item.guid],
  //     name: [item.name, Validators.required],
  //     size: [item.size, Validators.required],
  //     units: [item.units, Validators.required],
  //     energySource: [item.energySource, Validators.required]
  //   });
  //   return equipmentFormGroup;
  // }

  updateEnergyUseGroupFromForm(energyUseGroup: IdbFacilityEnergyUseGroup, form: FormGroup): IdbFacilityEnergyUseGroup {
    energyUseGroup.name = form.controls.name.value;
    // let equipmentItems: FormArray = form.get('equipmentItems') as FormArray;
    // equipmentItems.controls.forEach((equipmentItemFormValue: FormGroup, index) => {
    //   let equipmentItemIndex: number = energyUseGroup.equipmentItems.findIndex(item => { return item.guid == equipmentItemFormValue.controls.id.value});
    //   energyUseGroup.equipmentItems[equipmentItemIndex].name = equipmentItemFormValue.controls.name.value;
    //   energyUseGroup.equipmentItems[equipmentItemIndex].size = equipmentItemFormValue.controls.size.value;
    //   energyUseGroup.equipmentItems[equipmentItemIndex].units = equipmentItemFormValue.controls.units.value;    
    // });
    return energyUseGroup;
  }
}
