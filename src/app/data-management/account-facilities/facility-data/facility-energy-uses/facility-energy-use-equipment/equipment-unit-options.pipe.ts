import { Pipe, PipeTransform } from '@angular/core';
import { UtilityType } from './equipmentTypes';
import { EnergyUnitOptions, PowerUnitOptions, UnitOption, VolumeGasOptions, VolumeLiquidOptions } from 'src/app/shared/unitOptions';

@Pipe({
  name: 'equipmentUnitOptions',
  standalone: false
})
export class EquipmentUnitOptionsPipe implements PipeTransform {

  transform(utilityType: UtilityType): Array<UnitOption> {
    if(utilityType == 'Electricity' || utilityType == 'Natural Gas'){
      return [...EnergyUnitOptions, ...PowerUnitOptions];
    }else if(utilityType == 'Other Fuels'){
      return [...EnergyUnitOptions, ...PowerUnitOptions, ...VolumeLiquidOptions, ...VolumeLiquidOptions];
    }
    //unused
    else if(utilityType == 'Water' || utilityType == 'Waste Water'){
      return [...VolumeLiquidOptions, ...PowerUnitOptions];
    } 
    else if(utilityType == 'Compressed Air'){
      return [...PowerUnitOptions, ...VolumeGasOptions];
    } else if(utilityType == 'Steam'){
      return [...EnergyUnitOptions, ...VolumeGasOptions];
    }
    return [];
  }

}
