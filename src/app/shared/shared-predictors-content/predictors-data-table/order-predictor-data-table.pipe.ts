import { Pipe, PipeTransform } from '@angular/core';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import * as _ from 'lodash';

@Pipe({
  name: 'orderPredictorDataTable',
  standalone: false
})
export class OrderPredictorDataTablePipe implements PipeTransform {

  transform(predictorData: Array<IdbPredictorData>, orderDataBy: string, orderDirection: string, filterErrors: boolean): Array<IdbPredictorData> {
    let filteredData: Array<IdbPredictorData>;
    if (filterErrors) {
      filteredData = predictorData.filter(pData => {
        return pData.weatherDataWarning == true;
      })
    } else {
      filteredData = predictorData.map(pData => {
        return pData;
      })
    }
    if (orderDataBy == 'date') {
      return _.orderBy(filteredData, (data: IdbPredictorData) => {
        return new Date(data.date);
      }, orderDirection);
    } else {
      return _.orderBy(filteredData, orderDataBy, orderDirection);
    }
  }

}
