import { Pipe, PipeTransform } from '@angular/core';
import { AnalysisType } from 'src/app/models/idb';

@Pipe({
  name: 'analysisTypeLabel'
})
export class AnalysisTypeLabelPipe implements PipeTransform {

  transform(analysisType: AnalysisType): string {
    if (analysisType == 'regression') {
      return 'Regression';
    } else if (analysisType == 'absoluteEnergyConsumption') {
      return 'Absolute Energy Consumption';
    } else if (analysisType == 'energyIntensity') {
      return 'Energy Intensity';
    } else if (analysisType == 'modifiedEnergyIntensity') {
      return 'Modified Energy Intensity';
    }
    return;
  }
}
