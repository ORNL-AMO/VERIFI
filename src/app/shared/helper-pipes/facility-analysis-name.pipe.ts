import { Pipe, PipeTransform } from '@angular/core';
import { AccountWorkspaceQueryService } from 'src/app/account-workspace/account-workspace-query.service';

@Pipe({
    name: 'facilityAnalysisName',
    standalone: false
})
export class FacilityAnalysisNamePipe implements PipeTransform {

  constructor(private accountWorkspaceQuery: AccountWorkspaceQueryService) {
  }
  
  transform(analysisId: string): string {
    return this.accountWorkspaceQuery.getFacilityAnalysisByGuid(analysisId)?.name ?? '';
  }

}
