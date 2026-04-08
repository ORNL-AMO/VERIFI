import { Pipe, PipeTransform } from '@angular/core';
import { AnalysisSetupErrors } from 'src/app/models/validation';
import { AnalysisValidationService } from '../../validation/services/analysis-validation.service';

@Pipe({
  name: 'invalidAnalysis',
  standalone: false,
  pure: false
})
export class InvalidAnalysisPipe implements PipeTransform {

  constructor(private analysisValidationService: AnalysisValidationService
  ) { }

  transform(analysisItemID: string): AnalysisSetupErrors {
    return this.analysisValidationService.getErrorsByAnalysisId(analysisItemID);
  }

}
