import { Pipe, PipeTransform } from '@angular/core';
import { AnalysisSetupErrors } from 'src/app/models/validation';
import { AccountStatusCheckService } from '../../helper-services/account-status-check.service';

@Pipe({
  name: 'invalidAnalysis',
  standalone: false,
  pure: false
})
export class InvalidAnalysisPipe implements PipeTransform {

  constructor(private accountStatusCheckService: AccountStatusCheckService) { }

  transform(analysisItemID: string): AnalysisSetupErrors {
    return this.accountStatusCheckService.getErrorsByAnalysisId(analysisItemID);
  }

}
