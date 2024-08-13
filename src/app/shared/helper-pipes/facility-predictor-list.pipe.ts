import { Pipe, PipeTransform } from '@angular/core';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';

@Pipe({
  name: 'facilityPredictorList'
})
export class FacilityPredictorListPipe implements PipeTransform {

  transform(facilityGuid: string, accountPredictors: Array<IdbPredictor>): Array<IdbPredictor> {
    return accountPredictors.filter(predictorEntry => {
      return predictorEntry.facilityId == facilityGuid;
    });
  }

}
