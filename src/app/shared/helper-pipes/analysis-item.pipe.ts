import { Pipe, PipeTransform } from '@angular/core';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';

@Pipe({
  name: 'analysisItem',
  standalone: false,
})
export class AnalysisItemPipe implements PipeTransform {

  constructor(private analysisDbService: AnalysisDbService) { }

  transform(analysisItemId: string): IdbAnalysisItem {
    return this.analysisDbService.getByGuid(analysisItemId);
  }

}
