import { Pipe, PipeTransform } from '@angular/core';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import * as _ from 'lodash'

@Pipe({
  name: 'invalidMeter',
  standalone: false,
  pure: false
})
export class InvalidMeterPipe implements PipeTransform {

  transform(meterGuid: string, allMeterData: Array<IdbUtilityMeterData>): boolean {
    let hasDupReadings: Array<Date> = getHasDuplicateReadings(meterGuid, allMeterData);
    return hasDupReadings.length > 0;
  }

}



export function getHasDuplicateReadings(meterGuid: string, allMeterData: Array<IdbUtilityMeterData>): Array<Date> {
  let meterData: Array<IdbUtilityMeterData> = allMeterData.filter(mData => {
    return mData.meterId == meterGuid
  });
  let readDates: Array<Date> = meterData.map(mData => {
    let date: Date = new Date(mData.readDate);
    // return date.getFullYear() + '_' + date.getMonth() + '_' + date.getDate();
    return date
  });
  let counts: Array<any> = _.countBy(readDates, (date: Date) => {
    return date.getFullYear() + '_' + date.getMonth() + '_' + date.getDate();
  })
  let duplicateReadingDates: Array<Date> = new Array();
  for (let obj in counts) {
    if (counts[obj] > 1) {
      let vals = obj.split('_');
      duplicateReadingDates.push(new Date(Number(vals[0]), Number(vals[1]), Number(vals[2])));
    }
  }
  return duplicateReadingDates;
}