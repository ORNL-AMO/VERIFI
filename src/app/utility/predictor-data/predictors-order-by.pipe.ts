import { Pipe, PipeTransform } from '@angular/core';
import * as _ from 'lodash';
import { IdbPredictorEntry, PredictorData } from 'src/app/models/idb';

@Pipe({
  name: 'predictorsOrderBy',
  pure: false
})
export class PredictorsOrderByPipe implements PipeTransform {

  transform(data: Array<IdbPredictorEntry>, orderDataBy: string, orderDirection?: string): Array<any> {
    if (!orderDirection) {
      orderDirection = 'desc';
    }
    if (orderDataBy == 'date') {
      return _.orderBy(data, orderDataBy, orderDirection)
    } else {
      return _.orderBy(data, (data: IdbPredictorEntry) => {
        let predictorData: PredictorData = data.predictors.find(predictor => { return predictor.name == orderDataBy });
        if (predictorData) {
          return predictorData.amount;
        } else {
          return;
        }
      }, orderDirection);
    }
  }

}
