import { Pipe, PipeTransform } from '@angular/core';
import { ReportType } from 'src/app/models/constantsAndTypes';

@Pipe({
    name: 'accountReportType',
    standalone: false
})
export class AccountReportTypePipe implements PipeTransform {

  transform(reportType: ReportType): 'Better Plants' | 'Data Overview' | 'Performance' | 'Better Climate Report' {
    if (reportType == 'betterPlants') {
      return 'Better Plants';
    } else if (reportType == 'dataOverview') {
      return 'Data Overview';
    } else if (reportType == 'performance') {
      return 'Performance';
    } else if (reportType == 'betterClimate') {
      return 'Better Climate Report';
    }
    return;
  }

}
