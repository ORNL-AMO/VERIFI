import { Pipe, PipeTransform } from '@angular/core';
import { DatePipe } from '@angular/common';
import { getDateFromPredictorData } from '../dateHelperFunctions';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';

@Pipe({
  name: 'displayPredictorDataDate',
  standalone: false,
})
export class DisplayPredictorDataDatePipe implements PipeTransform {

  transform(predictorData: IdbPredictorData, options?: any): string {
    let date: Date = getDateFromPredictorData(predictorData);
    let datePipe: DatePipe = new DatePipe(navigator.language);
    // let stringFormat: string = 'shortTime';
    let timeStr = datePipe.transform(date, options);
    return timeStr;
  }

}
