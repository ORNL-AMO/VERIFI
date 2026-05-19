import { Pipe, PipeTransform } from '@angular/core';
import { MeterSource } from 'src/app/models/constantsAndTypes';

@Pipe({
  name: 'meterGroupSourceConflict',
  standalone: false,
  pure: false
})
export class MeterGroupSourceConflictPipe implements PipeTransform {

  transform(meterGroupSources: Array<MeterSource>, linkedMeterGroupSources: Array<MeterSource>): boolean {
    return meterGroupSources.some(source => linkedMeterGroupSources.includes(source));
  }

}
