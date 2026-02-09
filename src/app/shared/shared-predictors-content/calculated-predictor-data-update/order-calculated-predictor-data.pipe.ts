import { Pipe, PipeTransform } from '@angular/core';
import { CalculatedPredictorTableItem } from './calculated-predictor-data-update.component';
import * as _ from 'lodash';
import { getDateFromPredictorData } from '../../dateHelperFunctions';

@Pipe({
  name: 'orderCalculatedPredictorData',
  pure: false,
  standalone: false
})
export class OrderCalculatedPredictorDataPipe implements PipeTransform {

  transform(predictorData: Array<CalculatedPredictorTableItem>, orderDataBy: string, orderDirection: string): Array<CalculatedPredictorTableItem> {
    if(orderDataBy == 'date'){
      return _.orderBy(predictorData, (data: CalculatedPredictorTableItem) => {
        return getDateFromPredictorData(data).getTime();
      }, orderDirection);
    }else{
      return _.orderBy(predictorData, orderDataBy, orderDirection);
    }
  }


}
