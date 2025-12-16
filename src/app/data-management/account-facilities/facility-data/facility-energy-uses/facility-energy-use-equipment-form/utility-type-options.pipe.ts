import { Pipe, PipeTransform } from '@angular/core';
import { EquipmentType } from 'src/app/models/idbModels/facilityEnergyUseEquipment';
import { getUtilityTypesForEquipmentType } from './equipmentTypes';
import { MeterSource } from 'src/app/models/constantsAndTypes';

@Pipe({
  name: 'utilityTypeOptions',
  standalone: false
})
export class UtilityTypeOptionsPipe implements PipeTransform {

  transform(type: EquipmentType): Array<MeterSource> {
    return getUtilityTypesForEquipmentType(type)
  }
}
