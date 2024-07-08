import { Pipe, PipeTransform } from '@angular/core';
import { UtilityColors } from '../utilityColors';
import { MeterSource } from 'src/app/models/constantsAndTypes';

@Pipe({
  name: 'meterSourceColor'
})
export class MeterSourceColorPipe implements PipeTransform {

  transform(meterSource: MeterSource): string {
    if (UtilityColors[meterSource]) {
      return UtilityColors[meterSource].color
    }
    return '';
  }

}
