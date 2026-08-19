import { Pipe, PipeTransform } from '@angular/core';
import { AccountWorkspaceQueryService } from '@data/account-workspace/account-workspace-query.service';

@Pipe({
    name: 'facilityReportName',
    standalone: false
})
export class FacilityReportNamePipe implements PipeTransform {

  constructor(private accountWorkspaceQuery: AccountWorkspaceQueryService) {
  }
  
  transform(reportId: string): string {
    return this.accountWorkspaceQuery.getFacilityReportByGuid(reportId)?.name ?? '';
  }

}
