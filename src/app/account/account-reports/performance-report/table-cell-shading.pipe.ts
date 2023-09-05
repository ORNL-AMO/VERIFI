import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'tableCellShading'
})
export class TableCellShadingPipe implements PipeTransform {

  transform(value: number, min: number, max: number): string {
    if (value > 0) {
      let percent: number = Math.abs(value / max);
      return 'rgba(39, 174, 96, ' + percent + ')';

    } else if (value < 0) {
      let percent: number = Math.abs(value / min);
      return 'rgba(236, 112, 99, ' + percent + ')';
    }
    return null;
  }

}
