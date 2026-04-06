import { Pipe, PipeTransform } from '@angular/core';
import { AccountAnalysisSetupErrors } from 'src/app/models/accountAnalysis';
import { AccountAnalysisValidationService } from '../../validation/services/account-analysis-validation.service';

@Pipe({
  name: 'invalidAccountAnalysis',
  standalone: false,
  pure: false
})
export class InvalidAccountAnalysisPipe implements PipeTransform {

  constructor(private accountAnalysisValidationService: AccountAnalysisValidationService
  ) { }

  transform(analysisItemID: string): AccountAnalysisSetupErrors {
    return this.accountAnalysisValidationService.getErrorsByAccountAnalysisId(analysisItemID);
  }

}
