import { Pipe, PipeTransform } from '@angular/core';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';

@Pipe({
  name: 'accountAnalysisName'
})
export class AccountAnalysisNamePipe implements PipeTransform {

  constructor(private accountAnalysisDbService: AccountAnalysisDbService) {
  }
  
  transform(analysisId: string): string {
    return this.accountAnalysisDbService.getAccountAnalysisName(analysisId);
  }

}
