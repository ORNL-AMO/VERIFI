import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IdbFacilityEnergyUseGroup } from 'src/app/models/idbModels/facilityEnergyUseGroups';

@Injectable({
  providedIn: 'root'
})
export class FacilityEnergyUseGroupFormService {

  constructor(private formBuilder: FormBuilder) { }

  getFormFromEnergyUseGroup(group: IdbFacilityEnergyUseGroup): FormGroup {
    let formGroup: FormGroup = this.formBuilder.group({
      name: [group.name, Validators.required],
      notes: [group.notes]
    });
    return formGroup;
  }

  updateEnergyUseGroupFromForm(energyUseGroup: IdbFacilityEnergyUseGroup, form: FormGroup): IdbFacilityEnergyUseGroup {
    energyUseGroup.name = form.controls.name.value;
    energyUseGroup.notes = form.controls.notes.value;
    return energyUseGroup;
  }
}
