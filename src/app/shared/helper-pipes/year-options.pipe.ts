import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'yearOptions',
  pure: false
})
export class YearOptionsPipe implements PipeTransform {

  transform(years: Array<number>, minYear: number): Array<number> {
    return years.filter(year => { return minYear <= year});
  }

}
