import { Pipe, PipeTransform } from '@angular/core';
import { FacilityReportType } from 'src/app/models/idbModels/facilityReport';

@Pipe({
    name: 'facilityReportType',
    standalone: false
})
export class FacilityReportTypePipe implements PipeTransform {

  transform(reportType: FacilityReportType): 'Analysis' | 'Data Overview' | 'Emission Factors' | 'Savings' | 'Modeling' | 'Cost Savings' | 'Data Quality' | undefined {
    if(reportType == 'analysis'){
      return 'Analysis'
    } else if(reportType == 'overview'){
      return 'Data Overview'
    } else if(reportType == 'emissionFactors'){
      return 'Emission Factors'
    } else if(reportType == 'savings'){
      return 'Savings'
    } else if(reportType == 'modeling'){
      return 'Modeling'
    } else if(reportType == 'costSavings'){
      return 'Cost Savings'
    } else if(reportType == 'dataQuality'){
      return 'Data Quality'
    }
    return undefined;
  }

}
