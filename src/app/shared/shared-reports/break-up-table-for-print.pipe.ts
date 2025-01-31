import { Pipe, PipeTransform } from '@angular/core';
import { AnalysisTableColumns } from 'src/app/models/analysis';

@Pipe({
    name: 'breakUpTableForPrint',
    standalone: false
})
export class BreakUpTableForPrintPipe implements PipeTransform {

  transform(analysisTableColumns: AnalysisTableColumns, tableContext: 'annual' | 'monthly'): boolean {
    let numColumns: number = 1;

    if (tableContext == 'annual') {
      if (analysisTableColumns.actualEnergy) {
        numColumns++
      };
      if (analysisTableColumns.adjusted) {
        numColumns++
      };
      if (analysisTableColumns.baselineAdjustmentForNormalization) {
        numColumns++
      };
      if (analysisTableColumns.baselineAdjustmentForOther) {
        numColumns++
      };
      if (analysisTableColumns.baselineAdjustment) {
        numColumns++
      };
      if (analysisTableColumns.predictors) {
        analysisTableColumns.predictors.forEach(predictor => {
          if (predictor.display) {
            numColumns++
          }
        })
      };

      if (analysisTableColumns.SEnPI) {
        numColumns++
      };
      if (analysisTableColumns.savings) {
        numColumns++
      };
      if (analysisTableColumns.totalSavingsPercentImprovement) {
        numColumns++
      };
      if (analysisTableColumns.newSavings) {
        numColumns++
      };
      if (analysisTableColumns.annualSavingsPercentImprovement) {
        numColumns++
      };
      if (analysisTableColumns.cummulativeSavings) {
        numColumns++
      };
    } else if (tableContext == 'monthly') {
      numColumns++;

      if (analysisTableColumns.actualEnergy) {
        numColumns++
      };
      if (analysisTableColumns.modeledEnergy) {
        numColumns++
      };
      if (analysisTableColumns.adjusted) {
        numColumns++
      };
      if (analysisTableColumns.baselineAdjustmentForNormalization) {
        numColumns++
      };
      if (analysisTableColumns.baselineAdjustmentForOther) {
        numColumns++
      };
      if (analysisTableColumns.baselineAdjustment) {
        numColumns++
      };
      if (analysisTableColumns.predictors) {
        analysisTableColumns.predictors.forEach(predictor => {
          if (predictor.display) {
            numColumns++
          }
        })
      };
      if (analysisTableColumns.SEnPI) {
        numColumns++
      };
      if (analysisTableColumns.savings) {
        numColumns++
      };
      if (analysisTableColumns.percentSavingsComparedToBaseline) {
        numColumns++
      };
      if (analysisTableColumns.yearToDateSavings) {
        numColumns++
      };
      if (analysisTableColumns.yearToDatePercentSavings) {
        numColumns++
      };
      if (analysisTableColumns.rollingSavings) {
        numColumns++
      };
      if (analysisTableColumns.rolling12MonthImprovement) {
        numColumns++
      };
    }
    return numColumns > 8;
  }

}
