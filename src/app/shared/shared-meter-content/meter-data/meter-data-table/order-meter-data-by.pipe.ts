import { Pipe, PipeTransform } from '@angular/core';
import * as _ from 'lodash'
import { IdbUtilityMeterData, MeterDataCharge } from 'src/app/models/idbModels/utilityMeterData';

@Pipe({
  name: 'orderMeterDataBy',
  standalone: false
})
export class OrderMeterDataByPipe implements PipeTransform {

  transform(data: Array<IdbUtilityMeterData>, orderDataBy: string, orderDirection: string, chargeType?: 'amount' | 'usage'): Array<IdbUtilityMeterData> {

    return _.orderBy(data, (dataItem: IdbUtilityMeterData) => {
      if (chargeType) {
        let chargeVal: MeterDataCharge = dataItem.charges?.find(charge => {
          return charge.chargeGuid === orderDataBy;
        })
        if (chargeVal) {
          if (chargeType === 'amount') {
            return chargeVal.chargeAmount;
          } else {
            return chargeVal.chargeUsage;
          }
        }
      } else {
        return dataItem[orderDataBy];
      }
    }, orderDirection)
  }

}
