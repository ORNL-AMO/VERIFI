import { Pipe, PipeTransform } from '@angular/core';
import { IdbFacilityEnergyUseEquipment } from 'src/app/models/idbModels/facilityEnergyUseEquipment';

@Pipe({
  name: 'equipmentSourceIcons',
  standalone: false,
})
export class EquipmentSourceIconsPipe implements PipeTransform {

  transform(equipment: IdbFacilityEnergyUseEquipment): Array<EnergyUseIcons> {
    let icons: Array<EnergyUseIcons> = [];
    if (!equipment || !equipment.utilityData || equipment.utilityData.length === 0) {
      return ['fa-box'];
    } else {
      equipment.utilityData.forEach(utility => {
        switch (utility.energySource) {
          case "Electricity":
            if (!icons.includes('fa-plug-circle-bolt')) {
              icons.push('fa-plug-circle-bolt');
            }
            break;
          case "Natural Gas":
            if (!icons.includes('fa-fire-flame-curved')) {
              icons.push('fa-fire-flame-curved');
            }
            break;
          case "Other Fuels":
            if (!icons.includes('fa-gas-pump')) {
              icons.push('fa-gas-pump');
            }
            break;
        }
      });
    }
    if (icons.length === 0) {
      icons.push('fa-box');
    }
    return icons;
  }

}

export type EnergyUseIcons = 'fa-plug-circle-bolt' | 'fa-fire-flame-curved' | 'fa-gas-pump' | 'fa-box';
