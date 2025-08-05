import { Pipe, PipeTransform } from '@angular/core';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { getPredictorStatistics, PredictorStatistics } from './predictorDataQualityStatistics';

@Pipe({
  name: 'predictorDataQualityStatus',
  standalone: false
})
export class PredictorDataQualityStatusPipe implements PipeTransform {

  transform(predictor: IdbPredictor, allPredictorData: Array<IdbPredictorData>, isBtn: boolean): "btn-warning" | "btn-danger" | "btn-success" | "warning" | "danger" | "success" {
      let predictorData: Array<IdbPredictorData> = allPredictorData.filter(data => data.predictorId === predictor.guid);
      if (predictorData.length > 0) {
        let statistics: PredictorStatistics = getPredictorStatistics(predictorData.map(d => d.amount));
        if (statistics.outliers > 0) {
          return isBtn ? "btn-warning" : "warning";
        }
        return isBtn ? "btn-success" : "success";
      }
      return isBtn ? "btn-danger" : "danger";
    }

}
