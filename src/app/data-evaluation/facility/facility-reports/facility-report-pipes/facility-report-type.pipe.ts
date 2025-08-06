import { Pipe, PipeTransform } from '@angular/core';
import { FacilityReportType } from 'src/app/models/idbModels/facilityReport';

@Pipe({
    name: 'facilityReportType',
    standalone: false
})
export class FacilityReportTypePipe implements PipeTransform {

  transform(reportType: FacilityReportType): 'Analysis' | 'Data Overview' | 'Emission Factors' | undefined {
    if(reportType == 'analysis'){
      return 'Analysis'
    } else if(reportType == 'overview'){
      return 'Data Overview'
    } else if(reportType == 'emissionFactors'){
      return 'Emission Factors'
    }
    return undefined;
  }

}
