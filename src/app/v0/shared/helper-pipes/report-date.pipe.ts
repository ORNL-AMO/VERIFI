import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'reportDate',
  standalone: false
})
export class ReportDatePipe implements PipeTransform {

  transform(month: number, year: number): Date {
    return new Date(year, month, 1);
  }

}
