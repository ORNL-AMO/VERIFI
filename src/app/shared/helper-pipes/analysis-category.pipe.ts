import { Pipe, PipeTransform } from '@angular/core';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';

@Pipe({
  name: 'analysisCategory'
})
export class AnalysisCategoryPipe implements PipeTransform {

  constructor(private accountAnalysisDbService: AccountAnalysisDbService) {
  }

  transform(analysisId: string): 'Energy' | 'Water' | 'No Item Found' {
    if (analysisId) {
      let accountAnalysisItem: IdbAccountAnalysisItem = this.accountAnalysisDbService.getAccountAnalysisItem(analysisId);
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
