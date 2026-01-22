import { Pipe, PipeTransform } from '@angular/core';
import { FacilityEnergyUseEquipmentFormService, UtilityDataForm } from '../facility-energy-use-equipment-form/facility-energy-use-equipment-form.service';
import { IdbFacilityEnergyUseEquipment } from 'src/app/models/idbModels/facilityEnergyUseEquipment';
import { FormGroup } from '@angular/forms';

@Pipe({
  name: 'energyUseEquipmentInvalid',
  standalone: false,
  pure: false
})
export class EnergyUseEquipmentInvalidPipe implements PipeTransform {

  constructor(private facilityEnergyUseEquipmentFormService: FacilityEnergyUseEquipmentFormService) { }

  transform(facilityEnergyUseEquipment: Array<IdbFacilityEnergyUseEquipment>): boolean {
    let isInvalid: boolean = false;
    for (let equipment of facilityEnergyUseEquipment) {
      if (!isInvalid) {
        let forms: {
          equipmentDetailsForm: FormGroup,
          utilityDataForms: Array<UtilityDataForm>,
          annualOperatingConditionsDataForms: Array<FormGroup>
        } = this.facilityEnergyUseEquipmentFormService.getFormsFromEnergyUseEquipment(equipment);
        if (forms.equipmentDetailsForm.invalid) {
          isInvalid = true;
        }
        if (!isInvalid) {
          for (let utilityDataForm of forms.utilityDataForms) {
            if (utilityDataForm.utilityDataForm.invalid) {
              isInvalid = true;
              break;
            }
            for (let energyUseForm of utilityDataForm.energyUseForms) {
              if (energyUseForm.invalid) {
                isInvalid = true;
                break;
              }
            }
            if (isInvalid) {
              break;
            }
          }
        }
        if (!isInvalid) {
          for (let operatingConditionsForm of forms.annualOperatingConditionsDataForms) {
            if (operatingConditionsForm.invalid) {
              isInvalid = true;
              break;
            }
          }
        }
      }
    }
    return isInvalid;
  }

}
