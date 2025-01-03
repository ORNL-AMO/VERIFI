import { Pipe, PipeTransform } from '@angular/core';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';

@Pipe({
  name: 'facilityAnalysisName'
})
export class FacilityAnalysisNamePipe implements PipeTransform {

  constructor(private analysisDbService: AnalysisDbService) {
  }
  
  transform(analysisId: string): string {
    return this.analysisDbService.getAnalysisName(analysisId);
  }

}
