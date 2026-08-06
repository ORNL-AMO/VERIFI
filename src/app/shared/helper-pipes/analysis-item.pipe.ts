import { Pipe, PipeTransform } from '@angular/core';
import { AccountWorkspaceQueryService } from 'src/app/account-workspace/account-workspace-query.service';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';

@Pipe({
  name: 'analysisItem',
  standalone: false,
})
export class AnalysisItemPipe implements PipeTransform {

  constructor(private accountWorkspaceQuery: AccountWorkspaceQueryService) { }

  transform(analysisItemId: string): IdbAnalysisItem {
    return this.accountWorkspaceQuery.getFacilityAnalysisByGuid(analysisItemId);
  }

}
