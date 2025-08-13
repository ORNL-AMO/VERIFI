import { Pipe, PipeTransform } from '@angular/core';
import _ from 'lodash';
import { AccountReportTypePipe } from './account-report-type.pipe';

@Pipe({
  name: 'reportOrderBy',
  standalone: false
})
export class ReportOrderByPipe implements PipeTransform {

  constructor(private accountReportTypePipe: AccountReportTypePipe) { }

  transform(data: Array<any>, orderDataBy: string, orderDirection?: string): Array<any> {
    if (!orderDirection) {
      orderDirection = 'desc';
    }

    if (orderDataBy === 'report.modifiedDate') {
      return _.orderBy(
        data,
        item => new Date(_.get(item, orderDataBy)),
        orderDirection
      );
    }

    if (orderDataBy === 'report.reportYearOrEndYear') {
      return _.orderBy(
        data,
        item => {
          const endYear = item.report.endYear;
          const reportYear = item.report.reportYear;
          return endYear !== undefined && endYear !== null ? Number(endYear) : Number(reportYear);
        },
        orderDirection
      );
    }

    if (orderDataBy === 'report.reportType') {
      return _.orderBy(
        data,
        item => this.accountReportTypePipe.transform(_.get(item, orderDataBy)),
        orderDirection
      );
    }

    return _.orderBy(data, orderDataBy, orderDirection);
  }
}
