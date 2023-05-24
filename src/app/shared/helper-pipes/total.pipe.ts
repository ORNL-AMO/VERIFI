import { Pipe, PipeTransform } from '@angular/core';
import * as _ from 'lodash';
@Pipe({
  name: 'total',
  pure: false
})
export class TotalPipe implements PipeTransform {

  transform(values: Array<any>, sumBy: string): number {
    return _.sumBy(values, sumBy);
  }

}
