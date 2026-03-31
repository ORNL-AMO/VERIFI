import { Pipe, PipeTransform } from '@angular/core';
import _ from 'lodash';
import { getAccountReportType } from './account-report-type.pipe';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';

@Pipe({
  name: 'reportOrderBy',
  standalone: false
})
export class ReportOrderByPipe implements PipeTransform {

  transform(data: Array<IdbAccountReport>, orderDataBy: string, orderDirection: string, selectedReportType: string): Array<IdbAccountReport> {

    let filteredData: Array<IdbAccountReport> = data;
    if (selectedReportType) {
      filteredData = filteredData.filter(report => report.reportType === selectedReportType);
    }

    if (!orderDirection) {
      orderDirection = 'desc';
    }

    if (orderDataBy === 'modifiedDate') {
      return _.orderBy(
        filteredData,
        (item: IdbAccountReport) => new Date(item.modifiedDate),
        orderDirection
      );
    }

    if (orderDataBy === 'reportYear') {
      return _.orderBy(
        filteredData,
        (item: IdbAccountReport) => {
          const endYear = item.endYear;
          const reportYear = item.reportYear;
          return endYear !== undefined && endYear !== null ? Number(endYear) : Number(reportYear);
        },
        orderDirection
      );
    }

    if (orderDataBy === 'reportType') {
      return _.orderBy(
        filteredData,
        (item: IdbAccountReport) => getAccountReportType(item.reportType),
        orderDirection
      );
    }

    return _.orderBy(filteredData, orderDataBy, orderDirection);
  }
}
