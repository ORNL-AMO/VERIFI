import { Pipe, PipeTransform } from '@angular/core';
import { AnalysisGroup, GroupErrors } from 'src/app/models/analysis';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { getGroupErrors } from '../../validation/analysisValidation';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';

@Pipe({
  name: 'invalidGroupAnalysis',
  standalone: false,
})
export class InvalidGroupAnalysisPipe implements PipeTransform {

  constructor(private predictorDataDbService: PredictorDataDbService) { }

  transform(group: AnalysisGroup, analysisItem: IdbAnalysisItem, calendarizedMeters: Array<CalanderizedMeter>): GroupErrors {
    let facilityPredictorData: Array<IdbPredictorData> = this.predictorDataDbService.getByFacilityId(analysisItem.facilityId);
    return  getGroupErrors(group, analysisItem, calendarizedMeters, facilityPredictorData);
  }

}
