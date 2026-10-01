import { Pipe, PipeTransform } from '@angular/core';
import { IdbFacilityEnergyUseEquipment } from '@data/models/idbModels/facilityEnergyUseEquipment';
import { EnergyUseIcons, getEnergyUseSourceIcons } from '@shared/sharedHelperFunctions';

@Pipe({
  name: 'equipmentSourceIcons',
  standalone: false,
})
export class EquipmentSourceIconsPipe implements PipeTransform {

  transform(equipment: IdbFacilityEnergyUseEquipment): Array<EnergyUseIcons> {
    return getEnergyUseSourceIcons(equipment);
  }

}

