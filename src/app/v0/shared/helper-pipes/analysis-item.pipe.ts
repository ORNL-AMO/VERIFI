import { Pipe, PipeTransform } from '@angular/core';
import { AccountWorkspaceQueryService } from '@data/account-workspace/account-workspace-query.service';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';

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
