import { Pipe, PipeTransform } from '@angular/core';
import { JStatRegressionModel } from 'src/app/models/analysis';
import * as _ from 'lodash';
@Pipe({
  name: 'modelFilter',
  standalone: false,
  pure: false
})
export class ModelFilterPipe implements PipeTransform {

  transform(models: Array<JStatRegressionModel>,
    modelFilterOptions: {
      yearOptionSelections: Array<{ year: number, isChecked: boolean }>
      showInvalid: boolean;
      showFailedValidationModel: boolean;
    },
    orderDataBy: string,
    orderDirection?: string): Array<JStatRegressionModel> {

    let filteredModels: Array<JStatRegressionModel> = models;

    if (!modelFilterOptions.showInvalid) {
      filteredModels = filteredModels.filter(model => { return model.isValid });
    }
    if (!modelFilterOptions.showFailedValidationModel) {
      filteredModels = filteredModels.filter(model => {
        if (model.SEPValidation) {
          return model.SEPValidation.every(SEPValidation => SEPValidation.isValid)
        }
        return false;
      });
    }

    let includedYears: Array<number> = modelFilterOptions.yearOptionSelections.filter(option => option.isChecked).map(option => option.year);
    filteredModels = filteredModels.filter(model => includedYears.includes(model.modelYear));

    if (!orderDirection) {
      orderDirection = 'desc';
    }
    filteredModels = _.orderBy(filteredModels, orderDataBy, orderDirection)
    return filteredModels;
  }
}
