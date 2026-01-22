import { Injectable } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import { MeterSource } from 'src/app/models/constantsAndTypes';
import { EquipmentUtilityData, IdbFacilityEnergyUseEquipment } from 'src/app/models/idbModels/facilityEnergyUseEquipment';

export interface UtilityDataForm {
  energySource: MeterSource,
  utilityDataForm: FormGroup,
  energyUseForms: Array<FormGroup>
}

@Injectable({
  providedIn: 'root'
})
export class FacilityEnergyUseEquipmentFormService {

  constructor(private formBuilder: FormBuilder) {
  }

  getFormsFromEnergyUseEquipment(equipment: IdbFacilityEnergyUseEquipment): {
    equipmentDetailsForm: FormGroup,
    utilityDataForms: Array<UtilityDataForm>,
    annualOperatingConditionsDataForms: Array<FormGroup>
  } {
    let equipmentDetailsForm: FormGroup = this.getEquipmentDetailsFromFromEnergyUseEquipment(equipment);
    let utilityDataForms: Array<UtilityDataForm> = this.getUtilityDataFormsFromEnergyUseEquipment(equipment);
    let annualOperatingConditionsDataForms: Array<FormGroup> = this.getAnnualOperatingConditionsFormsFromEnergyUseEquipment(equipment);
    return {
      equipmentDetailsForm: equipmentDetailsForm,
      utilityDataForms: utilityDataForms,
      annualOperatingConditionsDataForms: annualOperatingConditionsDataForms
    };
  }

  updateEnergyUseEquipmentFromForms(equipment: IdbFacilityEnergyUseEquipment,
    equipmentDetailsForm: FormGroup,
    utilityDataForms: Array<UtilityDataForm>,
    annualOperatingConditionsDataForms: Array<FormGroup>): IdbFacilityEnergyUseEquipment {
    equipment = this.updateEnergyUseEquipmentDetailsFromForm(equipment, equipmentDetailsForm);
    equipment = this.updateUtilityDataFromForms(equipment, utilityDataForms);
    equipment = this.updateAnnualOperatingConditionsDataFromForms(equipment, annualOperatingConditionsDataForms);
    return equipment;
  }

  getEquipmentDetailsFromFromEnergyUseEquipment(equipment: IdbFacilityEnergyUseEquipment): FormGroup {
    let equipmentFormGroup: FormGroup = this.formBuilder.group({
      name: [equipment.name, Validators.required],
      notes: [equipment.notes],
      equipmentType: [equipment.equipmentType],
      utilityMeterGroupId: [equipment.utilityMeterGroupId]
    });
    return equipmentFormGroup;
  }

  updateEnergyUseEquipmentDetailsFromForm(equipment: IdbFacilityEnergyUseEquipment, form: FormGroup): IdbFacilityEnergyUseEquipment {
    equipment.name = form.controls.name.value;
    equipment.notes = form.controls.notes.value;
    equipment.equipmentType = form.controls.equipmentType.value;
    equipment.utilityMeterGroupId = form.controls.utilityMeterGroupId.value;
    return equipment;
  }

  getUtilityDataFormsFromEnergyUseEquipment(equipment: IdbFacilityEnergyUseEquipment): Array<UtilityDataForm> {
    let utilityDataForms: Array<UtilityDataForm> = [];
    equipment.utilityData.forEach((utilityData, index) => {
      let utilityDataFormObj = this.getUtilityDataForm(utilityData);
      utilityDataForms.push(utilityDataFormObj);
    });
    return utilityDataForms;
  }

  getUtilityDataForm(utilityData: EquipmentUtilityData): UtilityDataForm {
    let utilityDataForm: FormGroup = this.formBuilder.group({
      size: [utilityData.size, [Validators.required, Validators.min(0)]],
      numberOfEquipment: [utilityData.numberOfEquipment, [Validators.required, Validators.min(1)]],
      units: [utilityData.units, Validators.required]
    });
    let energyUseForms: Array<FormGroup> = [];
    utilityData.energyUse.forEach(energyUseData => {
      let energyUseForm: FormGroup = this.formBuilder.group({
        year: [energyUseData.year, Validators.required],
        energyUse: [{ value: energyUseData.energyUse, disabled: energyUseData.overrideEnergyUse === false }, Validators.required],
        overrideEnergyUse: [energyUseData.overrideEnergyUse, Validators.required]
      });
      energyUseForms.push(energyUseForm);
    });
    return {
      energySource: utilityData.energySource,
      utilityDataForm: utilityDataForm,
      energyUseForms: energyUseForms
    };
  }

  updateUtilityDataFromForms(equipment: IdbFacilityEnergyUseEquipment, utilityDataForms: Array<UtilityDataForm>): IdbFacilityEnergyUseEquipment {
    equipment.utilityData = [];
    for (let utilityDataFormObj of utilityDataForms) {
      let utilityData: EquipmentUtilityData = {
        energySource: utilityDataFormObj.energySource,
        size: utilityDataFormObj.utilityDataForm.controls.size.value,
        numberOfEquipment: utilityDataFormObj.utilityDataForm.controls.numberOfEquipment.value,
        units: utilityDataFormObj.utilityDataForm.controls.units.value,
        energyUse: []
      };
      for (let energyUseForm of utilityDataFormObj.energyUseForms) {
        utilityData.energyUse.push({
          year: energyUseForm.controls.year.value,
          energyUse: energyUseForm.controls.energyUse.value,
          overrideEnergyUse: energyUseForm.controls.overrideEnergyUse.value
        });
      }
      equipment.utilityData.push(utilityData);
    }
    return equipment;
  }

  getAnnualOperatingConditionsFormsFromEnergyUseEquipment(equipment: IdbFacilityEnergyUseEquipment): Array<FormGroup> {
    let operatingConditionsForms: Array<FormGroup> = [];
    equipment.operatingConditionsData.forEach(operatingConditionsData => {
      let operatingConditionsForm: FormGroup = this.formBuilder.group({
        year: [operatingConditionsData.year, Validators.required],
        dutyFactor: [operatingConditionsData.dutyFactor, [Validators.required, Validators.min(0), Validators.max(100)]],
        efficiency: [operatingConditionsData.efficiency, [Validators.required, Validators.min(0), Validators.max(100)]],
        hoursOfOperation: [operatingConditionsData.hoursOfOperation, [Validators.required, Validators.min(0)]],
        loadFactor: [operatingConditionsData.loadFactor, [Validators.required, Validators.min(0), Validators.max(100)]]
      });
      operatingConditionsForms.push(operatingConditionsForm);
    });
    return operatingConditionsForms;
  }

  updateAnnualOperatingConditionsDataFromForms(equipment: IdbFacilityEnergyUseEquipment, operatingConditionsForms: Array<FormGroup>): IdbFacilityEnergyUseEquipment {
    equipment.operatingConditionsData = [];
    for (let i = 0; i < operatingConditionsForms.length; i++) {
      let operatingConditionsForm: FormGroup = operatingConditionsForms[i];
      equipment.operatingConditionsData.push({
        year: operatingConditionsForm.controls.year.value,
        dutyFactor: operatingConditionsForm.controls.dutyFactor.value,
        efficiency: operatingConditionsForm.controls.efficiency.value,
        hoursOfOperation: operatingConditionsForm.controls.hoursOfOperation.value,
        loadFactor: operatingConditionsForm.controls.loadFactor.value
      });
    }
    return equipment;
  }

  // updateEnergyUseEquipmentFromForm(equipment: IdbFacilityEnergyUseEquipment, form: FormGroup): IdbFacilityEnergyUseEquipment {
  //   equipment.name = form.controls.name.value;
  //   equipment.notes = form.controls.notes.value;
  //   equipment.equipmentType = form.controls.equipmentType.value;
  //   equipment.utilityMeterGroupId = form.controls.utilityMeterGroupId.value;
  //   //update utility data
  //   let includedSources: Array<MeterSource> = [];
  //   Object.keys(form.controls).forEach(controlName => {
  //     if (controlName.startsWith('utilityData_')) {
  //       let source: MeterSource = controlName.replace('utilityData_', '').replace(/_/g, ' ') as MeterSource;
  //       includedSources.push(source);
  //     }
  //   });
  //   //remove any utility data not included
  //   equipment.utilityData = equipment.utilityData.filter(utilityData => {
  //     return includedSources.includes(utilityData.energySource);
  //   });
  //   //add any new utility data
  //   includedSources.forEach(source => {
  //     let existingUtilityData = equipment.utilityData.find(utilityData => { return utilityData.energySource == source; });
  //     if (!existingUtilityData) {
  //       equipment.utilityData.push({
  //         energySource: source,
  //         size: 0,
  //         numberOfEquipment: 1,
  //         units: '',
  //         energyUse: []
  //       });
  //     }
  //   });
  //   //update utility data values from form
  //   for (let i = 0; i < equipment.utilityData.length; i++) {
  //     let utilityDataForm = form.controls['utilityData_' + equipment.utilityData[i].energySource.replace(/\s+/g, '_')] as FormGroup;
  //     equipment.utilityData[i].size = utilityDataForm.controls.size.value;
  //     equipment.utilityData[i].numberOfEquipment = utilityDataForm.controls.numberOfEquipment.value;
  //     equipment.utilityData[i].units = utilityDataForm.controls.units.value;
  //     equipment.utilityData[i].energyUse = [];
  //     if (utilityDataForm.contains('energyUse')) {
  //       let energyUseArray = utilityDataForm.controls.energyUse as FormArray;
  //       for (let j = 0; j < energyUseArray.length; j++) {
  //         let energyUseGroup = energyUseArray.at(j) as FormGroup;
  //         equipment.utilityData[i].energyUse.push({
  //           year: energyUseGroup.controls.year.value,
  //           energyUse: energyUseGroup.controls.energyUse.value,
  //           overrideEnergyUse: energyUseGroup.controls.overrideEnergyUse.value
  //         });
  //       }
  //     }
  //   }
  //   return equipment;
  // }

  // addUtilityDataToForm(form: FormGroup, utilityData: EquipmentUtilityData = { energySource: 'Other', size: 0, numberOfEquipment: 1, units: '', energyUse: [] }) {
  //   let utilityDataGroup: FormGroup = this.formBuilder.group({
  //     size: [utilityData.size, [Validators.required, Validators.min(0)]],
  //     numberOfEquipment: [utilityData.numberOfEquipment, [Validators.required, Validators.min(1)]],
  //     units: [utilityData.units, Validators.required]
  //   });

  //   if (utilityData.energyUse.length > 0) {
  //     utilityDataGroup.addControl('energyUse', this.formBuilder.array(utilityData.energyUse.map(eu => {
  //       const group = this.formBuilder.group({
  //         year: [eu.year, Validators.required],
  //         energyUse: [{ value: eu.energyUse, disabled: eu.overrideEnergyUse === false }, Validators.required],
  //         overrideEnergyUse: [eu.overrideEnergyUse, Validators.required]
  //       });
  //       return group;
  //     })));
  //   }

  //   form.addControl('utilityData_' + utilityData.energySource.replace(/\s+/g, '_'), utilityDataGroup);
  // }

  // removeUtilityDataFromForm(form: FormGroup, energySource: MeterSource) {
  //   form.removeControl('utilityData_' + energySource.replace(/\s+/g, '_'));
  // }

  // addYearToUtilityDataForm(form: FormGroup, year: number) {
  //   Object.keys(form.controls).forEach(controlName => {
  //     if (controlName.startsWith('utilityData_')) {
  //       let utilityDataForm = form.controls[controlName] as FormGroup;
  //       if (utilityDataForm.contains('energyUse')) {
  //         let energyUseArray = utilityDataForm.controls.energyUse as FormArray;
  //         //TODO: calculate energy use
  //         energyUseArray.push(this.formBuilder.group({
  //           year: [year, Validators.required],
  //           energyUse: [{ value: 0, disabled: true }, Validators.required],
  //           overrideEnergyUse: [false, Validators.required]
  //         }));
  //       }
  //     }
  //   });
  // }

  // removeYearFromUtilityDataForm(form: FormGroup, year: number) {
  //   Object.keys(form.controls).forEach(controlName => {
  //     if (controlName.startsWith('utilityData_')) {
  //       let utilityDataForm = form.controls[controlName] as FormGroup;
  //       if (utilityDataForm.contains('energyUse')) {
  //         let energyUseArray = utilityDataForm.controls.energyUse as FormArray;
  //         let indexToRemove = energyUseArray.controls.findIndex(group => {
  //           return (group as FormGroup).controls.year.value === year;
  //         });
  //         if (indexToRemove !== -1) {
  //           energyUseArray.removeAt(indexToRemove);
  //         }
  //       }
  //     }
  //   });
  // }

  // removeAllYearsFromUtilityDataForm(form: FormGroup) {
  //   Object.keys(form.controls).forEach(controlName => {
  //     if (controlName.startsWith('utilityData_')) {
  //       let utilityDataForm = form.controls[controlName] as FormGroup;
  //       if (utilityDataForm.contains('energyUse')) {
  //         utilityDataForm.removeControl('energyUse');
  //       }
  //     }
  //   })
  // }

}