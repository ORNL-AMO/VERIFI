import { Pipe, PipeTransform } from '@angular/core';
import { JStatRegressionModel } from 'src/app/models/analysis';

@Pipe({
  name: 'modelFilter'
})
export class ModelFilterPipe implements PipeTransform {

  transform(models: Array<JStatRegressionModel>, showInvalid: boolean): Array<JStatRegressionModel> {
    if (!showInvalid) {
      return models.filter(model => { return model.isValid });
    } else {
      return models;
    }
  }

}
