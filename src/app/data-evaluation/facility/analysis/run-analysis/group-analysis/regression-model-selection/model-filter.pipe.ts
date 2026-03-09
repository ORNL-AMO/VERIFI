import { Pipe, PipeTransform } from '@angular/core';
import { JStatRegressionModel } from 'src/app/models/analysis';

@Pipe({
  name: 'modelFilter',
  standalone: false
})
export class ModelFilterPipe implements PipeTransform {

  transform(models: Array<JStatRegressionModel>, showInvalid: boolean, showFailedValidationModel: boolean, isYearSelectionChanged: boolean, includedYears: Array<number>): Array<JStatRegressionModel> {

    let filteredModels: Array<JStatRegressionModel> = models;

    if (!showInvalid) {
      filteredModels = filteredModels.filter(model => { return model.isValid });
    }
    if (!showFailedValidationModel) {
      filteredModels = filteredModels.filter(model => {
        if (model.SEPValidation) {
          return model.SEPValidation.every(SEPValidation => SEPValidation.isValid)
        }
        return false;
      });
    }

    if (!isYearSelectionChanged && includedYears.length === 0) {
      return filteredModels;
    }
    if (includedYears.length === 0) {
      return [];
    }
    return filteredModels.filter(model => includedYears.includes(model.modelYear));
  }
}
