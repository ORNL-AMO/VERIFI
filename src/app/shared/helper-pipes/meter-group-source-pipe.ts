import { Pipe, PipeTransform } from '@angular/core';
import { MeterSource } from 'src/app/models/constantsAndTypes';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import * as _ from 'lodash';

@Pipe({
  name: 'meterGroupSource',
  standalone: false,
})
export class MeterGroupSourcePipe implements PipeTransform {

  transform(meterGroupId: string, meters: Array<IdbUtilityMeter>): MeterSource | 'Mixed' {
    let groupMeters: Array<IdbUtilityMeter> = meters.filter(meter => { return meter.groupId == meterGroupId; });
    let sources: Array<MeterSource> = groupMeters.map(meter => { return meter.source; });
    sources = _.uniq(sources);
    if (sources.length === 1) {
      return sources[0];
    } else if (sources.length > 1) {
      return 'Mixed';
    }
  }

}
