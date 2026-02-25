import { Pipe, PipeTransform } from '@angular/core';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { Month, Months } from '../form-data/months';

@Pipe({
  name: 'displayMeterDataDate',
  standalone: false,
})
export class DisplayMeterDataDatePipe implements PipeTransform {

  transform(meterData: IdbUtilityMeterData): string {
    let month: Month = Months.find(month => month.monthNumValue == (meterData.month - 1));
    return month.abbreviation + ' ' + meterData.day + ', ' + meterData.year;
  }
}
