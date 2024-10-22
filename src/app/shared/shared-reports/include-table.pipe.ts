import { Pipe, PipeTransform } from '@angular/core';
import { AnalysisTableColumns } from 'src/app/models/analysis';

@Pipe({
  name: 'includeTable'
})
export class IncludeTablePipe implements PipeTransform {

  transform(analysisTableColumns: AnalysisTableColumns, reportSection: 'consumption' | 'predictors' | 'savings'): boolean {
    let includeTable: boolean = false;
    if (reportSection == 'consumption') {
      if (analysisTableColumns.energy) {
        includeTable = true;
      }
    } else if (reportSection == 'predictors') {
      if (analysisTableColumns.productionVariables) {
        includeTable = true;
      }
    } else if (reportSection == 'savings') {
      if (analysisTableColumns.incrementalImprovement) {
        includeTable = true;
      }
    }
    return includeTable;
  }

}
