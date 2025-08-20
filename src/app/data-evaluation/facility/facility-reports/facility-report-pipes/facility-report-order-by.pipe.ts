import { Pipe, PipeTransform } from '@angular/core';
import _ from 'lodash';
import { FacilityReportTypePipe } from './facility-report-type.pipe';
import { IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';

@Pipe({
  name: 'facilityReportOrderBy',
  standalone: false
})
export class FacilityReportOrderByPipe implements PipeTransform {

  constructor(private facilityReportTypePipe: FacilityReportTypePipe) { }

  transform(data: Array<IdbFacilityReport>, orderDataBy: string, orderDirection: string, selectedReportType: string): Array<IdbFacilityReport> {

    let filteredData = data;
    if (selectedReportType) {
      filteredData = filteredData.filter(val => val.facilityReportType === selectedReportType);
    }

    if (!orderDirection) {
      orderDirection = 'desc';
    }

    if (orderDataBy === 'modifiedDate') {
      return _.orderBy(
        filteredData,
        item => new Date(_.get(item, orderDataBy)),
        orderDirection
      );
    }

    if (orderDataBy === 'facilityReportType') {
      return _.orderBy(
        filteredData,
        item => this.facilityReportTypePipe.transform(_.get(item, orderDataBy)),
        orderDirection
      );
    }
   
    if (orderDataBy === 'sortYear') {
      return _.orderBy(
        filteredData,
        item => {
          const year = item.dataOverviewReportSettings?.endYear ?? item.emissionFactorsReportSettings?.endYear ?? item.savingsReportSettings?.endYear;
          return Number(year);
        },
        orderDirection
      );
    }

    return _.orderBy(filteredData, orderDataBy, orderDirection);
  }

}
