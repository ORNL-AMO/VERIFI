import { Pipe, PipeTransform } from '@angular/core';
import { AccountWorkspaceQueryService } from 'src/app/account-workspace/account-workspace-query.service';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';

@Pipe({
    name: 'analysisCategory',
    standalone: false
})
export class AnalysisCategoryPipe implements PipeTransform {

  constructor(private accountWorkspaceQuery: AccountWorkspaceQueryService) {
  }

  transform(analysisId: string): 'Energy' | 'Water' | 'No Item Found' {
    if (analysisId) {
      let accountAnalysisItem: IdbAccountAnalysisItem = this.accountWorkspaceQuery.getAccountAnalysisByGuid(analysisId);
      if (accountAnalysisItem) {
        if(accountAnalysisItem.analysisCategory == 'energy'){
          return 'Energy';
        }else if(accountAnalysisItem.analysisCategory == 'water'){
          return 'Water';
        }
      }
    }
    return 'No Item Found';
  }

}
