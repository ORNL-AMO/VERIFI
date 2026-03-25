import { Pipe, PipeTransform } from '@angular/core';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import * as _ from 'lodash'
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { FormGroup } from '@angular/forms';
import { EditMeterFormService } from '../shared-meter-content/edit-meter-form/edit-meter-form.service';

@Pipe({
  name: 'invalidMeter',
  standalone: false,
  pure: false
})
export class InvalidMeterPipe implements PipeTransform {

  constructor(
    private utilityMeterDbService: UtilityMeterdbService,
    // private utilityMeterDataDbService: UtilityMeterDatadbService,
    private editMeterFormService: EditMeterFormService
  ) { }

  transform(meterGuid: string): boolean {
    let meter: IdbUtilityMeter = this.utilityMeterDbService.getFacilityMeterById(meterGuid);
    let meterForm: FormGroup = this.editMeterFormService.getFormFromMeter(meter);
    return meterForm.invalid;
    // let hasDupReadings: Array<Date> = getHasDuplicateReadings(meterGuid, allMeterData);
    // return hasDupReadings.length > 0;
  }

}



// export function getHasDuplicateReadings(meterGuid: string, allMeterData: Array<IdbUtilityMeterData>): Array<Date> {
//   let meterData: Array<IdbUtilityMeterData> = allMeterData.filter(mData => {
//     return mData.meterId == meterGuid
//   });
//   let readDates: Array<string> = meterData.map(mData => {
//     return mData.year + '_' + mData.month + '_' + mData.day;
//   });
//   let counts: Array<any> = _.countBy(readDates, (dateStr: string) => {
//     return dateStr;
//   })
//   let duplicateReadingDates: Array<Date> = new Array();
//   for (let obj in counts) {
//     if (counts[obj] > 1) {
//       let vals = obj.split('_');
//       duplicateReadingDates.push(new Date(Number(vals[0]), Number(vals[1]), Number(vals[2])));
//     }
//   }
//   return duplicateReadingDates;
// }