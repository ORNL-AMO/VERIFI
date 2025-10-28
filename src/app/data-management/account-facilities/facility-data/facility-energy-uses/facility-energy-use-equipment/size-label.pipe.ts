import { Pipe, PipeTransform } from '@angular/core';
import { EquipmentType } from 'src/app/models/idbModels/facilityEnergyUseEquipment';
import { UtilityType } from './equipmentTypes';

@Pipe({
  name: 'sizeLabel',
  standalone: false
})
export class SizeLabelPipe implements PipeTransform {

  transform(equipmentType: EquipmentType, utilityType: UtilityType): string {
    if (!equipmentType) {
      return 'Total Size';
    }
    if (['Pump', 'Fan', 'Motor', 'Other'].includes(equipmentType)) {
      return 'Rated Power';
    } else if (equipmentType === 'Compressed Air') {
      if (utilityType === 'Compressed Air') {
        return 'Estimated Power';
      } else {
        return 'Rated Power';
      }
    } else if (equipmentType === 'Lighting') {
      return 'Light Wattage';
    } else if (equipmentType === 'Process Heating'
      || equipmentType === 'Process Cooling'
      || equipmentType === 'HVAC') {
      return 'Rated Capacity';
    } else if (equipmentType === 'Steam') {
      if (utilityType === 'Steam') {
        return 'Estimated Capacity';
      } else {
        return 'Rated Capacity';
      }
    } else {
      return 'Total Size';
    }
  }

}
