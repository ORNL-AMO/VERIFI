import { Pipe, PipeTransform } from '@angular/core';
import { IdbPredictorEntry, PredictorData } from 'src/app/models/idb';

@Pipe({
  name: 'facilityPredictorList'
})
export class FacilityPredictorListPipe implements PipeTransform {

  transform(facilityGuid: string, accountPredictorEntries: Array<IdbPredictorEntry>): Array<PredictorData> {
    let facilityPredictorEntry: IdbPredictorEntry = accountPredictorEntries.find(predictorEntry => {
      return predictorEntry.facilityId == facilityGuid;
    });
    if (facilityPredictorEntry) {
      return facilityPredictorEntry.predictors
    }
    return [];
  }

}
