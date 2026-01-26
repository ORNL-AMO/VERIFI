import { Pipe, PipeTransform } from '@angular/core';
import { UtilityColors } from '../utilityColors';
import { MeterSource } from 'src/app/models/constantsAndTypes';

@Pipe({
  name: 'meterSourceColor',
  standalone: false
})
export class MeterSourceColorPipe implements PipeTransform {

  transform(meterSource: MeterSource | 'Mixed'): string {
    if (meterSource == 'Mixed') {
      return '#79716B'
    }
    if (UtilityColors[meterSource]) {
      return UtilityColors[meterSource].color
    }
    return '';
  }

}
