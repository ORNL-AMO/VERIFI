import { Pipe, PipeTransform } from '@angular/core';
import { EnergyEquipmentEnergyUseData } from 'src/app/models/idbModels/facilityEnergyUseEquipment';

@Pipe({
  name: 'orderEquipmentEnergyUse',
  standalone: false,
  pure: false
})
export class OrderEquipmentEnergyUsePipe implements PipeTransform {

  transform(energyUseData: Array<EnergyEquipmentEnergyUseData>): Array<EnergyEquipmentEnergyUseData> {
    return energyUseData.sort((a, b) => a.year - b.year);
  }

}
