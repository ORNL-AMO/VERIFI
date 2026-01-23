import { Pipe, PipeTransform } from '@angular/core';
import { PowerUnitOptions, UnitOption, VolumeLiquidOptions } from 'src/app/shared/unitOptions';
import { MeterSource } from 'src/app/models/constantsAndTypes';
import { getUnitOptionsForUtilityType } from '../calculations/equipmentTypes';

@Pipe({
  name: 'equipmentUnitOptions',
  standalone: false
})
export class EquipmentUnitOptionsPipe implements PipeTransform {

  //TODO: Meter source and Utility Type don't have same properties
  transform(utilityType: MeterSource): Array<UnitOption> {
    return getUnitOptionsForUtilityType(utilityType);
    // if(utilityType == 'Electricity' || utilityType == 'Natural Gas'){
    //   return [...PowerUnitOptions];
    // }else if(utilityType == 'Other Fuels' || utilityType == 'Other Energy'){
    //   return [...PowerUnitOptions, ...VolumeLiquidOptions, ...VolumeLiquidOptions];
    // }
    //unused
    // else if(utilityType == 'Water Discharge' || utilityType == 'Water Intake'){
    //   return [...VolumeLiquidOptions, ...PowerUnitOptions];
    // } 
    // else if(utilityType == 'Compressed Air'){
    //   return [...PowerUnitOptions, ...VolumeGasOptions];
    // } else if(utilityType == 'Steam'){
    //   return [...EnergyUnitOptions, ...VolumeGasOptions];
    // }
    // return [];
  }

}
