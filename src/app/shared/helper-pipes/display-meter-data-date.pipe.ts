import { Pipe, PipeTransform } from '@angular/core';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { getDateFromMeterData } from '../dateHelperFunctions';
import { DatePipe } from '@angular/common';

@Pipe({
  name: 'displayMeterDataDate',
  standalone: false,
})
export class DisplayMeterDataDatePipe implements PipeTransform {

  transform(meterData: IdbUtilityMeterData, options?: any): string {
    let date: Date = getDateFromMeterData(meterData);
    let datePipe: DatePipe = new DatePipe(navigator.language);
    // let stringFormat: string = 'shortTime';
    let timeStr = datePipe.transform(date, options);
    return timeStr;
  }
}
