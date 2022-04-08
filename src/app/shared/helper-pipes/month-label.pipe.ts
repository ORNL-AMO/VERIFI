import { Pipe, PipeTransform } from '@angular/core';
import { Month, Months } from '../form-data/months';

@Pipe({
  name: 'monthLabel'
})
export class MonthLabelPipe implements PipeTransform {

  transform(value: number, abbreviation?: boolean): string {
    let month: Month = Months.find(month => { return month.monthNumValue == value });
    if (month) {
      if (!abbreviation) {
        return month.name
      } else {
        return month.abbreviation;
      }
    }
    return '';
  }

}
