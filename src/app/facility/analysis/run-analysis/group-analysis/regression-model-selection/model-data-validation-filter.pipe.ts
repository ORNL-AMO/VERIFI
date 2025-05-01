import { Pipe, PipeTransform } from '@angular/core';
import { JStatRegressionModel } from 'src/app/models/analysis';

@Pipe({
  name: 'modelDataValidationFilter',
  standalone: false
})
export class ModelDataValidationFilterPipe implements PipeTransform {

   transform(models: Array<JStatRegressionModel>, showFailedDataValidation: boolean): Array<JStatRegressionModel> {
      if (!showFailedDataValidation) {
        return models.filter(model => {return model.SEPValidation.every(SEPValidation => SEPValidation.isValid)});
      } else {
        return models;
      }
    }
}
