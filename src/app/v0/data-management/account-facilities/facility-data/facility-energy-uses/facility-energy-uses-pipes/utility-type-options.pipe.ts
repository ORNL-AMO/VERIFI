import { Pipe, PipeTransform } from '@angular/core';
import { EquipmentType } from '@app/models/idbModels/facilityEnergyUseEquipment';
import { MeterSource } from '@app/models/constantsAndTypes';
import { getUtilityTypesForEquipmentType } from '@v0/data-management/account-facilities/facility-data/facility-energy-uses/setup/facility-energy-use-equipment-form/equipment-details-form/equipmentTypes';

@Pipe({
  name: 'utilityTypeOptions',
  standalone: false
})
export class UtilityTypeOptionsPipe implements PipeTransform {

  transform(type: EquipmentType): Array<MeterSource> {
    return getUtilityTypesForEquipmentType(type)
  }
}
