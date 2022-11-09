import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'yearDisplay',
  pure: false
})
export class YearDisplayPipe implements PipeTransform {

  transform(value: number | string, fiscalYearSelection: "calendarYear" | "nonCalendarYear"): number |string {
    if(fiscalYearSelection == "nonCalendarYear"){
      return 'FY - ' + value;
    }else{
      return value;
    }
  }

}
