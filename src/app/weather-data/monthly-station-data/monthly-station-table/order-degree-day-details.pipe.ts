import { Pipe, PipeTransform } from '@angular/core';
import { DetailDegreeDay } from 'src/app/models/degreeDays';
import * as _ from 'lodash';

@Pipe({
  name: 'orderDegreeDayDetails',
  pure: false
})
export class OrderDegreeDayDetailsPipe implements PipeTransform {

  transform(data: Array<DetailDegreeDay>, orderDataBy: string, orderDirection?: string): Array<DetailDegreeDay> {
    if (!orderDirection) {
      orderDirection = 'desc';
    }
    return _.orderBy(data, orderDataBy, orderDirection)
  }

}
