import { Injectable } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { MeterSource } from 'src/app/models/constantsAndTypes';
import { EquipmentUtilityData, IdbFacilityEnergyUseEquipment } from 'src/app/models/idbModels/facilityEnergyUseEquipment';

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
      this.addUtilityDataToForm(equipmentFormGroup, utilityData);
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
          units: '',
          energyUse: []
        });
      }
    });
    //update utility data values from form
    for (let i = 0; i < equipment.utilityData.length; i++) {
      let utilityDataForm = form.controls['utilityData_' + equipment.utilityData[i].energySource.replace(/\s+/g, '_')] as FormGroup;
      equipment.utilityData[i].size = utilityDataForm.controls.size.value;
      equipment.utilityData[i].numberOfEquipment = utilityDataForm.controls.numberOfEquipment.value;
      equipment.utilityData[i].units = utilityDataForm.controls.units.value;
      equipment.utilityData[i].energyUse = [];
      if (utilityDataForm.contains('energyUse')) {
        let energyUseArray = utilityDataForm.controls.energyUse as FormArray;
        for (let j = 0; j < energyUseArray.length; j++) {
          let energyUseGroup = energyUseArray.at(j) as FormGroup;
          equipment.utilityData[i].energyUse.push({
            year: energyUseGroup.controls.year.value,
            energyUse: energyUseGroup.controls.energyUse.value,
            overrideEnergyUse: energyUseGroup.controls.overrideEnergyUse.value
          });
        }
      }
    }
    return equipment;
  }

  addUtilityDataToForm(form: FormGroup, utilityData: EquipmentUtilityData = { energySource: 'Other', size: 0, numberOfEquipment: 1, units: '', energyUse: [] }) {
    let utilityDataGroup: FormGroup = this.formBuilder.group({
      size: [utilityData.size, [Validators.required, Validators.min(0)]],
      numberOfEquipment: [utilityData.numberOfEquipment, [Validators.required, Validators.min(1)]],
      units: [utilityData.units, Validators.required]
    });

    if (utilityData.energyUse.length > 0) {
      utilityDataGroup.addControl('energyUse', this.formBuilder.array(utilityData.energyUse.map(eu => {
        const group = this.formBuilder.group({
          year: [eu.year, Validators.required],
          energyUse: [{ value: eu.energyUse, disabled: eu.overrideEnergyUse === false }, Validators.required],
          overrideEnergyUse: [eu.overrideEnergyUse, Validators.required]
        });
        return group;
      })));
    }

    form.addControl('utilityData_' + utilityData.energySource.replace(/\s+/g, '_'), utilityDataGroup);
  }

  removeUtilityDataFromForm(form: FormGroup, energySource: MeterSource) {
    form.removeControl('utilityData_' + energySource.replace(/\s+/g, '_'));
  }

  addYearToUtilityDataForm(form: FormGroup, year: number) {
    Object.keys(form.controls).forEach(controlName => {
      if (controlName.startsWith('utilityData_')) {
        let utilityDataForm = form.controls[controlName] as FormGroup;
        if (utilityDataForm.contains('energyUse')) {
          let energyUseArray = utilityDataForm.controls.energyUse as FormArray;
          //TODO: calculate energy use
          energyUseArray.push(this.formBuilder.group({
            year: [year, Validators.required],
            energyUse: [{ value: 0, disabled: true }, Validators.required],
            overrideEnergyUse: [false, Validators.required]
          }));
        }
      }
    });
  }

  removeYearFromUtilityDataForm(form: FormGroup, year: number) {
    Object.keys(form.controls).forEach(controlName => {
      if (controlName.startsWith('utilityData_')) {
        let utilityDataForm = form.controls[controlName] as FormGroup;
        if (utilityDataForm.contains('energyUse')) {
          let energyUseArray = utilityDataForm.controls.energyUse as FormArray;
          let indexToRemove = energyUseArray.controls.findIndex(group => {
            return (group as FormGroup).controls.year.value === year;
          });
          if (indexToRemove !== -1) {
            energyUseArray.removeAt(indexToRemove);
          }
        }
      }
    });
  }

  removeAllYearsFromUtilityDataForm(form: FormGroup) {
    Object.keys(form.controls).forEach(controlName => {
      if (controlName.startsWith('utilityData_')) {
        let utilityDataForm = form.controls[controlName] as FormGroup;
        if (utilityDataForm.contains('energyUse')) {
          utilityDataForm.removeControl('energyUse');
        }
      }
    })
  }

}