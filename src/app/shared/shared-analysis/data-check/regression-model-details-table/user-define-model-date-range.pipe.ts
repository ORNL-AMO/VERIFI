import { Pipe, PipeTransform } from '@angular/core';
import { AnalysisGroup } from 'src/app/models/analysis';
import { Month, Months } from 'src/app/shared/form-data/months';

@Pipe({
  name: 'userDefineModelDateRange',
  standalone: false,
})
export class UserDefineModelDateRangePipe implements PipeTransform {

  transform(analysisGroup: AnalysisGroup): string {
    let startMonth: Month = Months.find(m => m.monthNumValue === analysisGroup.regressionModelStartMonth);
    let endMonth: Month = Months.find(m => m.monthNumValue === analysisGroup.regressionModelEndMonth);
    if (startMonth && endMonth) {
      return `${startMonth.abbreviation}, ${analysisGroup.regressionStartYear} - ${endMonth.abbreviation}, ${analysisGroup.regressionEndYear}`;
    }
    return '-';
  }

}
