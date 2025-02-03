import { Pipe, PipeTransform } from '@angular/core';
import { AnalysisType } from 'src/app/models/analysis';

@Pipe({
    name: 'analysisTypeLabel',
    standalone: false
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
    } else if (analysisType == 'skip' || analysisType == 'skipAnalysis') {
      return 'Group Skipped'
    }
    return;
  }
}
