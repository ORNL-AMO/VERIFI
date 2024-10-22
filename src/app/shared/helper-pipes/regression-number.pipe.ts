import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'regressionNumber'
})
export class RegressionNumberPipe implements PipeTransform {

  transform(value: number): string {
    let valueStr: string;
    if (isNaN(value) == false && value != null) {
      valueStr = (value).toLocaleString(undefined, { maximumSignificantDigits: 3, minimumSignificantDigits: 3 });
    }
    return valueStr;
  }

}
