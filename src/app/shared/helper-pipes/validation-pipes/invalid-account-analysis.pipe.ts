import { Pipe, PipeTransform } from '@angular/core';
import { AccountAnalysisSetupErrors } from 'src/app/models/accountAnalysis';
import { AccountStatusCheckService } from '../../helper-services/account-status-check.service';

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
