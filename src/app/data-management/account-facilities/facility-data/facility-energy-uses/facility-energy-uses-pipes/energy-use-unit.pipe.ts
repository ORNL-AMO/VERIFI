import { Pipe, PipeTransform } from '@angular/core';
import { getEnergyUseUnit } from 'src/app/calculations/energy-footprint/energyFootprintCalculations';

@Pipe({
  name: 'energyUseUnit',
  standalone: false,
})
export class EnergyUseUnitPipe implements PipeTransform {

  transform(unitValue: string): string {
    return getEnergyUseUnit(unitValue);
  }

}
