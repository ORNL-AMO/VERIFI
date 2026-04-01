import { Pipe, PipeTransform } from '@angular/core';
import { GroupAnalysisErrors } from 'src/app/models/validation';
import { AnalysisGroupValidationService } from '../../validation/services/analysis-group-validation.service';

@Pipe({
  name: 'invalidGroupAnalysis',
  standalone: false,
  pure: false
})
export class InvalidGroupAnalysisPipe implements PipeTransform {

  constructor(private analysisGroupValidationService: AnalysisGroupValidationService
  ) { }

  transform(groupID: string, analysisId: string): GroupAnalysisErrors {
    return this.analysisGroupValidationService.getGroupErrorsByGroupId(groupID, analysisId);
  }

}
