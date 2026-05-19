import { Pipe, PipeTransform } from '@angular/core';
import { FacilityReportErrors } from 'src/app/models/validation';
import { AccountStatusCheckService } from '../../helper-services/account-status-check.service';

@Pipe({
  name: 'invalidFacilityReport',
  standalone: false,
  pure: false
})
export class InvalidFacilityReportPipe implements PipeTransform {

  constructor(private accountStatusCheckService: AccountStatusCheckService) { }

  transform(facilityReportID: string): FacilityReportErrors {
    return this.accountStatusCheckService.getFacilityReportErrorsByReportId(facilityReportID);
  }

}
