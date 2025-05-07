import { Pipe, PipeTransform } from '@angular/core';
import { JStatRegressionModel } from 'src/app/models/analysis';

@Pipe({
  name: 'modelFilter',
  standalone: false
})
export class ModelFilterPipe implements PipeTransform {

  transform(models: Array<JStatRegressionModel>, showInvalid: boolean, showFailedValidationModel: boolean): Array<JStatRegressionModel> {

    let filteredModels: Array<JStatRegressionModel> = models;
    if(!showInvalid){
      filteredModels = filteredModels.filter(model => { return model.isValid });
    }
    if(!showFailedValidationModel){
      filteredModels = filteredModels.filter(model => { return model.SEPValidation.every(SEPValidation => SEPValidation.isValid) });
    }
    return filteredModels;
  }
}
