import { Pipe, PipeTransform } from '@angular/core';
import { AccountWorkspaceQueryService } from '@data/account-workspace/account-workspace-query.service';

@Pipe({
  name: 'accountReportName',
  standalone: false
})
export class AccountReportNamePipe implements PipeTransform {

  constructor(private accountWorkspaceQuery: AccountWorkspaceQueryService) {
  }

  transform(reportId: string): string {
    return this.accountWorkspaceQuery.getAccountReportByGuid(reportId)?.name ?? '';
  }

}
