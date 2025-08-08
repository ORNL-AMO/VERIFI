import { Pipe, PipeTransform } from '@angular/core';
import _ from 'lodash';
import { FacilityReportTypePipe } from './facility-report-type.pipe';

@Pipe({
  name: 'facilityReportOrderBy',
  standalone: false
})
export class FacilityReportOrderByPipe implements PipeTransform {

  constructor(private facilityReportTypePipe: FacilityReportTypePipe) { }

  transform(data: Array<any>, orderDataBy: string, orderDirection?: string): Array<any> {
    if (!orderDirection) {
      orderDirection = 'desc';
    }

    if (orderDataBy === 'modifiedDate') {
      return _.orderBy(
        data,
        item => new Date(_.get(item, orderDataBy)),
        orderDirection
      );
    }

    if (orderDataBy === 'facilityReportType') {
      return _.orderBy(
        data,
        item => this.facilityReportTypePipe.transform(_.get(item, orderDataBy)),
        orderDirection
      );
    }
    if (orderDataBy === 'report.reportYear') {
      return _.orderBy(
        data,
        item => Number(_.get(item, orderDataBy)),
        orderDirection
      );
    }

    if (orderDataBy === 'sortYear') {
      return _.orderBy(
        data,
        item => {
          const year = item.dataOverviewReportSettings?.endYear ?? item.emissionFactorsReportSettings?.endYear;
          return Number(year);
        },
        orderDirection
      );
    }

    return _.orderBy(data, orderDataBy, orderDirection);
  }

}
