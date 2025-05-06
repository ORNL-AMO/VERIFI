import { Pipe, PipeTransform } from '@angular/core';
import { JStatRegressionModel } from 'src/app/models/analysis';

@Pipe({
  name: 'modelFilter',
  standalone: false
})
export class ModelFilterPipe implements PipeTransform {

  transform(models: Array<JStatRegressionModel>, showInvalid: boolean, filterType: 'invalidModel' | 'failedDataValidation'): Array<JStatRegressionModel> {

    if (filterType == 'invalidModel') {
      if (!showInvalid) {
        return models.filter(model => { return model.isValid });
      } else {
        return models;
      }
    }

    if (filterType == 'failedDataValidation') {
      if (!showInvalid) {
        return models.filter(model => { return model.SEPValidation.every(SEPValidation => SEPValidation.isValid) });
      } else {
        return models;
      }
    }
  }
}
