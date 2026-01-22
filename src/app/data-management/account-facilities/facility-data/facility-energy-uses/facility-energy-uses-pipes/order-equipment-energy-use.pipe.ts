import { Pipe, PipeTransform } from '@angular/core';
import { EnergyEquipmentOperatingConditionsData } from 'src/app/models/idbModels/facilityEnergyUseEquipment';

@Pipe({
  name: 'orderEquipmentEnergyUse',
  standalone: false,
  pure: false
})
export class OrderEquipmentEnergyUsePipe implements PipeTransform {

  transform(energyUseData: Array<EnergyEquipmentOperatingConditionsData>): Array<EnergyEquipmentOperatingConditionsData> {
    return energyUseData.sort((a, b) => a.year - b.year);
  }

}
