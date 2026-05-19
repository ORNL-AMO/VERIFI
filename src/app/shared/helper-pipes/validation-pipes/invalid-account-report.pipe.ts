import { Pipe, PipeTransform } from '@angular/core';
import { AccountReportErrors } from 'src/app/models/validation';
import { AccountStatusCheckService } from '../../helper-services/account-status-check.service';

@Pipe({
  name: 'invalidAccountReport',
  standalone: false,
  pure: false
})
export class InvalidAccountReportPipe implements PipeTransform {

  constructor(private accountStatusCheckService: AccountStatusCheckService) { }

  transform(accountReportID: string): AccountReportErrors {
    return this.accountStatusCheckService.getAccountReportErrorsByReportId(accountReportID);
  }

}
