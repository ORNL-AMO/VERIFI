import { Pipe, PipeTransform } from '@angular/core';
import { IdbFacilityEnergyUseEquipment } from 'src/app/models/idbModels/facilityEnergyUseEquipment';

@Pipe({
  name: 'facilityEnergyEquipmentName',
  standalone: false,
})
export class FacilityEnergyEquipmentNamePipe implements PipeTransform {

  transform(equipmentGuid: string, facilityEnergyEquipment: Array<IdbFacilityEnergyUseEquipment>): string {
    let equipment: IdbFacilityEnergyUseEquipment = facilityEnergyEquipment.find(equip => equip.guid == equipmentGuid);
    if (equipment) {
      return equipment.name;
    } 
    return '';
  }

}
