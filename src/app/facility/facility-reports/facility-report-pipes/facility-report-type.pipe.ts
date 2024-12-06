import { Pipe, PipeTransform } from '@angular/core';
import { FacilityReportType } from 'src/app/models/idbModels/facilityReport';

@Pipe({
  name: 'facilityReportType'
})
export class FacilityReportTypePipe implements PipeTransform {

  transform(reportType: FacilityReportType): 'Analysis' {
    if(reportType == 'analysis'){
      return 'Analysis'
    }
    return null;
  }

}
