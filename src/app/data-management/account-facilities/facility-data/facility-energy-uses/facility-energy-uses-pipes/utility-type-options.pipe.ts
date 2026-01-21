import { Pipe, PipeTransform } from '@angular/core';
import { EquipmentType } from 'src/app/models/idbModels/facilityEnergyUseEquipment';
import { MeterSource } from 'src/app/models/constantsAndTypes';
import { getUtilityTypesForEquipmentType } from '../calculations/equipmentTypes';

@Pipe({
  name: 'utilityTypeOptions',
  standalone: false
})
export class UtilityTypeOptionsPipe implements PipeTransform {

  transform(type: EquipmentType): Array<MeterSource> {
    return getUtilityTypesForEquipmentType(type)
  }
}
