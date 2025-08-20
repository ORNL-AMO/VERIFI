import { Pipe, PipeTransform } from '@angular/core';
import _ from 'lodash';
import { AccountReportTypePipe } from './account-report-type.pipe';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';

@Pipe({
  name: 'reportOrderBy',
  standalone: false
})
export class ReportOrderByPipe implements PipeTransform {

  constructor(private accountReportTypePipe: AccountReportTypePipe) { }

  transform(data: Array<{ isValid: boolean, report: IdbAccountReport }>, orderDataBy: string, orderDirection: string, selectedReportType: string): Array<{ isValid: boolean, report: IdbAccountReport }> {
    
    let filteredData = data;
    if (selectedReportType) {
      filteredData = filteredData.filter(val => val.report.reportType === selectedReportType);
    }

    if (!orderDirection) {
      orderDirection = 'desc';
    }

    if (orderDataBy === 'report.modifiedDate') {
      return _.orderBy(
        filteredData,
        item => new Date(_.get(item, orderDataBy)),
        orderDirection
      );
    }

    if (orderDataBy === 'report.reportYearOrEndYear') {
      return _.orderBy(
        filteredData,
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
        filteredData,
        item => this.accountReportTypePipe.transform(_.get(item, orderDataBy)),
        orderDirection
      );
    }

    return _.orderBy(filteredData, orderDataBy, orderDirection);
  }
}
