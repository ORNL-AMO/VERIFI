import { Pipe, PipeTransform } from '@angular/core';
import { AccountReportErrors } from 'src/app/models/validation';
import { AccountReportValidationService } from '../../validation/services/account-report-validation.service';

@Pipe({
  name: 'invalidAccountReport',
  standalone: false,
  pure: false
})
export class InvalidAccountReportPipe implements PipeTransform {

  constructor(private accountReportValidationService: AccountReportValidationService
  ) { }

  transform(accountReportID: string): AccountReportErrors {
    return this.accountReportValidationService.getErrorsByReportId(accountReportID);
  }

}
