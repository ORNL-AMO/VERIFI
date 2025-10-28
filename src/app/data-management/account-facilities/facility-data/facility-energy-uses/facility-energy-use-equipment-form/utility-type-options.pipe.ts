import { Pipe, PipeTransform } from '@angular/core';
import { EquipmentType } from 'src/app/models/idbModels/facilityEnergyUseEquipment';
import { getUtilityTypesForEquipmentType, UtilityType } from './equipmentTypes';

@Pipe({
  name: 'utilityTypeOptions',
  standalone: false
})
export class UtilityTypeOptionsPipe implements PipeTransform {

  transform(type: EquipmentType): Array<UtilityType> {
    return getUtilityTypesForEquipmentType(type)
  }
}
