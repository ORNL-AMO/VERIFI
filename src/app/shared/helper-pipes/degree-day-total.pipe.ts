import { Pipe, PipeTransform } from '@angular/core';
import * as _ from 'lodash';
import { DetailDegreeDay, WeatherDataSelection } from 'src/app/models/degreeDays';
import { getDegreeDayAmount } from '../sharedHelperFuntions';

@Pipe({
  name: 'degreeDayTotal',
  pure: false
})
export class DegreeDayTotalPipe implements PipeTransform {

  transform(values: Array<DetailDegreeDay>, sumBy: 'minutesBetween' | 'heatingDegreeDay' | 'coolingDegreeDay' | 'relativeHumidity' | 'dryBulbTemp' | 'days'): number {
    if (sumBy == 'minutesBetween') {
      return _.sumBy(values, (degreeDay: DetailDegreeDay) => {
        return degreeDay.minutesBetween;
      });
    } else if (sumBy == 'days') {
      let totalMinutes: number = _.sumBy(values, (degreeDay: DetailDegreeDay) => {
        return degreeDay.minutesBetween;
      });
      return totalMinutes / 1440;
    } else {
      let weatherDataSelection: WeatherDataSelection = sumBy as WeatherDataSelection;
      return getDegreeDayAmount(values, weatherDataSelection);
    }
  }

}
