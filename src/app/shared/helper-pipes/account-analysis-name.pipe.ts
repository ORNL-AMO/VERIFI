import { Pipe, PipeTransform } from '@angular/core';
import { AccountWorkspaceQueryService } from 'src/app/account-workspace/account-workspace-query.service';

@Pipe({
    name: 'accountAnalysisName',
    standalone: false
})
export class AccountAnalysisNamePipe implements PipeTransform {

  constructor(private accountWorkspaceQuery: AccountWorkspaceQueryService) {
  }
  
  transform(analysisId: string): string {
    return this.accountWorkspaceQuery.getAccountAnalysisByGuid(analysisId)?.name ?? '';
  }

}
