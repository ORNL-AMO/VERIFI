import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { calculateTotalEquipmentEnergyUse } from 'src/app/calculations/energy-footprint/energyFootprintCalculations';
import { MeterSource } from 'src/app/models/constantsAndTypes';
import { EnergyEquipmentOperatingConditionsData, EquipmentUtilityData, EquipmentUtilityDataEnergyUse, IdbFacilityEnergyUseEquipment } from 'src/app/models/idbModels/facilityEnergyUseEquipment';

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
      utilityMeterGroupIds: [equipment.utilityMeterGroupIds]
    });
    return equipmentFormGroup;
  }

  updateEnergyUseEquipmentDetailsFromForm(equipment: IdbFacilityEnergyUseEquipment, form: FormGroup): IdbFacilityEnergyUseEquipment {
    equipment.name = form.controls.name.value;
    equipment.notes = form.controls.notes.value;
    equipment.equipmentType = form.controls.equipmentType.value;
    equipment.utilityMeterGroupIds = form.controls.utilityMeterGroupIds.value;
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
      let energyUseForm: FormGroup = this.getEnergyUseForm(energyUseData);
      energyUseForms.push(energyUseForm);
    });
    return {
      energySource: utilityData.energySource,
      utilityDataForm: utilityDataForm,
      energyUseForms: energyUseForms
    };
  }

  getEnergyUseForm(energyUseData: EquipmentUtilityDataEnergyUse): FormGroup {
    return this.formBuilder.group({
      year: [energyUseData.year, Validators.required],
      energyUse: [{ value: energyUseData.energyUse, disabled: energyUseData.overrideEnergyUse === false }, Validators.required],
      overrideEnergyUse: [energyUseData.overrideEnergyUse, Validators.required]
    });
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
      let operatingConditionsForm: FormGroup = this.getOperatingConditionsYearForm(operatingConditionsData);
      operatingConditionsForms.push(operatingConditionsForm);
    });
    return operatingConditionsForms;
  }

  getOperatingConditionsYearForm(operatingConditionsData: EnergyEquipmentOperatingConditionsData): FormGroup {
    let operatingConditionsForm: FormGroup = this.formBuilder.group({
      year: [operatingConditionsData.year, Validators.required],
      dutyFactor: [operatingConditionsData.dutyFactor, [Validators.required, Validators.min(0), Validators.max(100)]],
      efficiency: [operatingConditionsData.efficiency, [Validators.required, Validators.min(0), Validators.max(100)]],
      hoursOfOperation: [operatingConditionsData.hoursOfOperation, [Validators.required, Validators.min(0)]],
      loadFactor: [operatingConditionsData.loadFactor, [Validators.required, Validators.min(0), Validators.max(100)]]
    });
    operatingConditionsForm.controls['year'].disable();
    return operatingConditionsForm;
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

  calculateEnergyUse(
    utilityDataForms: Array<UtilityDataForm>,
    annualOperatingConditionsDataForms: Array<FormGroup>): {
      utilityDataForms: Array<UtilityDataForm>,
      annualOperatingConditionsDataForms: Array<FormGroup>
    } {
    utilityDataForms.forEach(utilityDataFormObj => {
      let energyUseForms: Array<FormGroup> = utilityDataFormObj.energyUseForms;
      energyUseForms.forEach(energyUseForm => {
        if (energyUseForm.valid && !energyUseForm.controls.overrideEnergyUse.value) {
          let year: number = energyUseForm.controls.year.value;
          let operatingConditions: FormGroup = annualOperatingConditionsDataForms.find(form => { return form.controls.year.value == year });
          if (operatingConditions && operatingConditions.valid) {
            //Example calculation (Electric Motor): Energy Use (kWh) = Size (kW) x Number of Motors x Load Factor x Duty Factor x Hours of Operation / Efficiency
            let calculatedEnergyUse: number = calculateTotalEquipmentEnergyUse(operatingConditions.value, utilityDataFormObj.utilityDataForm.value);
            energyUseForm.patchValue({
              energyUse: calculatedEnergyUse
            }, { emitEvent: false });
          }
        }
      });
    });

    return {
      utilityDataForms: utilityDataForms,
      annualOperatingConditionsDataForms: annualOperatingConditionsDataForms
    }
  }
}