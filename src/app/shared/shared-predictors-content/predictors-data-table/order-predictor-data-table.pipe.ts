import { Pipe, PipeTransform } from '@angular/core';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import * as _ from 'lodash';

@Pipe({
  name: 'orderPredictorDataTable'
})
export class OrderPredictorDataTablePipe implements PipeTransform {

  transform(predictorData: Array<IdbPredictorData>, orderDataBy: string, orderDirection: string): Array<IdbPredictorData> {
    return _.orderBy(predictorData, orderDataBy, orderDirection);
  }

}
