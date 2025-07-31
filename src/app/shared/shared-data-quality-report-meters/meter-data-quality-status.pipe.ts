import { Pipe, PipeTransform } from '@angular/core';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { getStatistics, Statistics } from './meterDataQualityStatistics';

@Pipe({
  name: 'meterDataQualityStatus',
  standalone: false
})
export class MeterDataQualityStatusPipe implements PipeTransform {

  transform(meter: IdbUtilityMeter, allMeterData: Array<IdbUtilityMeterData>, isBtn: boolean): "btn-warning" | "btn-danger" | "btn-success" | "warning" | "danger" | "success" {
    let meterData: Array<IdbUtilityMeterData> = allMeterData.filter(data => data.meterId === meter.guid);
    if (meterData.length > 0) {
      let statistics: {
        energyStats: Statistics;
        costStats: Statistics;
      } = getStatistics(meterData, meter);
      if (statistics.energyStats.outliers > 0 || statistics.costStats.outliers > 0) {
        return isBtn ? "btn-warning" : "warning";
      }
      return isBtn ? "btn-success" : "success";
    }
    return isBtn ? "btn-danger" : "danger";
  }

}
