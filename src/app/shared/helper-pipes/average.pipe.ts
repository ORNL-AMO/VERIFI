import { Pipe, PipeTransform } from '@angular/core';
import * as _ from 'lodash';

@Pipe({
  name: 'average',
  pure: false
})
export class AveragePipe implements PipeTransform {

  transform(values: Array<any>, sumBy: string): number {
    return _.meanBy(values, sumBy);
  }

}
