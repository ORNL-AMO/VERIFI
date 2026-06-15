import { Pipe, PipeTransform } from '@angular/core';
import { GroupAnalysisErrors } from 'src/app/models/validation';
import { AccountStatusCheckService } from '../../helper-services/account-status-check.service';

@Pipe({
  name: 'invalidGroupAnalysis',
  standalone: false,
  pure: false
})
export class InvalidGroupAnalysisPipe implements PipeTransform {

  constructor(private accountStatusCheckService: AccountStatusCheckService) { }

  transform(groupID: string, analysisId: string): GroupAnalysisErrors {
    return this.accountStatusCheckService.getGroupErrorsByGroupId(groupID, analysisId);
  }

}
