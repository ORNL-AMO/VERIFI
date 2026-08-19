import { Pipe, PipeTransform } from '@angular/core';
import { AccountAnalysisSetupErrors } from '@data/models/accountAnalysis';
import { AccountStatusCheckService } from '@shared/helper-services/account-status-check.service';

@Pipe({
  name: 'invalidAccountAnalysis',
  standalone: false,
  pure: false
})
export class InvalidAccountAnalysisPipe implements PipeTransform {

  constructor(private accountStatusCheckService: AccountStatusCheckService) { }

  transform(analysisItemID: string): AccountAnalysisSetupErrors {
    return this.accountStatusCheckService.getAccountAnalysisErrorsByAnalysisId(analysisItemID);
  }

}
