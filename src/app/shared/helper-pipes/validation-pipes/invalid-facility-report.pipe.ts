import { Pipe, PipeTransform } from '@angular/core';
import { FacilityReportErrors } from 'src/app/models/validation';
import { FacilityReportValidationService } from '../../validation/services/facility-report-validation.service';

@Pipe({
  name: 'invalidFacilityReport',
  standalone: false,
  pure: false
})
export class InvalidFacilityReportPipe implements PipeTransform {

  constructor(private facilityReportValidationService: FacilityReportValidationService
  ) { }

  transform(facilityReportID: string): FacilityReportErrors {
    return this.facilityReportValidationService.getErrorsByReportId(facilityReportID);
  }

}
