import { Pipe, PipeTransform } from '@angular/core';
import { IdbFacilityEnergyUseEquipment } from 'src/app/models/idbModels/facilityEnergyUseEquipment';
import { EnergyUseIcons, getEnergyUseSourceIcons } from '../sharedHelperFunctions';

@Pipe({
  name: 'equipmentSourceIcons',
  standalone: false,
})
export class EquipmentSourceIconsPipe implements PipeTransform {

  transform(equipment: IdbFacilityEnergyUseEquipment): Array<EnergyUseIcons> {
    return getEnergyUseSourceIcons(equipment);
  }

}

