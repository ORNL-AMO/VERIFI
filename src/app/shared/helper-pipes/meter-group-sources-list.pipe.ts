import { Pipe, PipeTransform } from '@angular/core';
import { MeterSource } from 'src/app/models/constantsAndTypes';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';

@Pipe({
  name: 'meterGroupSourcesList',
  standalone: false
})
export class MeterGroupSourcesListPipe implements PipeTransform {

  transform(meterGroupId: string, meters: Array<IdbUtilityMeter>): Array<MeterSource> {
    let groupMeters: Array<IdbUtilityMeter> = meters.filter(meter => { return meter.groupId == meterGroupId; });
    let sources: Array<MeterSource> = groupMeters.map(meter => { return meter.source; });
    return sources.filter((source, index) => {
      return sources.indexOf(source) == index;
    });
  }

}
