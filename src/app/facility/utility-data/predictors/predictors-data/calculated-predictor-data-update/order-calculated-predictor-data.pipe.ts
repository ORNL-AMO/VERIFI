import { Pipe, PipeTransform } from '@angular/core';
import { CalculatedPredictorTableItem } from './calculated-predictor-data-update.component';
import * as _ from 'lodash';

@Pipe({
  name: 'orderCalculatedPredictorData'
})
export class OrderCalculatedPredictorDataPipe implements PipeTransform {

  transform(predictorData: Array<CalculatedPredictorTableItem>, orderDataBy: string, orderDirection: string): Array<CalculatedPredictorTableItem> {
    return _.orderBy(predictorData, orderDataBy, orderDirection);
  }


}
