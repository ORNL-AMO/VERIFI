import { Pipe, PipeTransform } from '@angular/core';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';

@Pipe({
  name: 'accountReportName',
  standalone: false
})
export class AccountReportNamePipe implements PipeTransform {

  constructor(private accountReportDbService: AccountReportDbService) {
  }

  transform(reportId: string): string {
    return this.accountReportDbService.getReportName(reportId);
  }

}
