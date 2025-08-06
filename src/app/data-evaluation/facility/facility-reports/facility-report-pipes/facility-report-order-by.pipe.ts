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
 
     return _.orderBy(data, orderDataBy, orderDirection);
   }

}
