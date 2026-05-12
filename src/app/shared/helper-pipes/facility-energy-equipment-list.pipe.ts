import { Pipe, PipeTransform } from '@angular/core';
import { IdbFacilityEnergyUseEquipment } from 'src/app/models/idbModels/facilityEnergyUseEquipment';

@Pipe({
  name: 'facilityEnergyEquipmentList',
  standalone: false
})
export class FacilityEnergyEquipmentListPipe implements PipeTransform {

  transform(energyUseGroupId: string, accountFacilityEnergyUseEquipment: Array<IdbFacilityEnergyUseEquipment>): Array<IdbFacilityEnergyUseEquipment> {
    return accountFacilityEnergyUseEquipment.filter(energyUseEquipment => {
      return energyUseEquipment.energyUseGroupId == energyUseGroupId;
    });
  }
}
