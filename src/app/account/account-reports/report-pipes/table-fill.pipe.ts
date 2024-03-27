import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'tableFill'
})
export class TableFillPipe implements PipeTransform {

  transform(value: number, total: number): string {
    let percent: number = (Math.abs(value) / total) * 100;
    return percent + '% 100%';
  }

}
