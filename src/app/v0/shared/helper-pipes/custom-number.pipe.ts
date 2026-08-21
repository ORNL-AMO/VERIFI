import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'customNumber',
    pure: false,
    standalone: false
})
export class CustomNumberPipe implements PipeTransform {

  transform(value: number, isCurrency?: boolean): string {
    let valueStr: string;
    if (isNaN(value) == false && value != null) {
      if (Math.abs(value) < 10000) {
        if (Math.abs(value) < .00001) {
          valueStr = '0';
        } else {
          //5 sig figs
          valueStr = (value).toLocaleString(undefined, { maximumSignificantDigits: 5 });
        }
      } else {
        //no decimals
        valueStr = (value).toLocaleString(undefined, { maximumFractionDigits: 0, minimumIntegerDigits: 1 });
      }

      if (isCurrency) {
        valueStr = '$' + valueStr;
      }
    }
    return valueStr;
  }

}
