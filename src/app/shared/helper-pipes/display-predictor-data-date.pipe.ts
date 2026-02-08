import { Pipe, PipeTransform } from '@angular/core';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { Month, Months } from '../form-data/months';

@Pipe({
  name: 'displayPredictorDataDate',
  standalone: false,
})
export class DisplayPredictorDataDatePipe implements PipeTransform {

  transform(predictorData: IdbPredictorData): string {
    let month: Month = Months.find(month => month.monthNumValue == (predictorData.month - 1));
    return month.abbreviation + ', ' + predictorData.year;
  }

}
