import { Pipe, PipeTransform } from '@angular/core';
import { EquipmentType } from 'src/app/models/idbModels/facilityEnergyUseEquipment';

@Pipe({
  name: 'sizeLabel',
  standalone: false
})
export class SizeLabelPipe implements PipeTransform {

  //TODO: Use Meter Source?
  transform(equipmentType: EquipmentType): string {
    if (!equipmentType) {
      return 'Total Size';
    }
    if (['Pump', 'Fan', 'Motor', 'Other'].includes(equipmentType)) {
      return 'Rated Power';
    } else if (equipmentType === 'Compressed Air') {
      return 'Rated Power';
    } else if (equipmentType === 'Lighting') {
      return 'Light Wattage';
    } else if (equipmentType === 'Process Heating'
      || equipmentType === 'Process Cooling'
      || equipmentType === 'HVAC') {
      return 'Rated Capacity';
    } else if (equipmentType === 'Steam') {
      return 'Rated Capacity';
    } else {
      return 'Total Size';
    }
  }

}
