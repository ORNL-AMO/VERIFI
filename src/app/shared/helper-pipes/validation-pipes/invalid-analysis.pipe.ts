import { Pipe, PipeTransform } from '@angular/core';
import { AnalysisSetupErrors } from 'src/app/models/analysis';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { getAnalysisSetupErrors } from '../../validation/analysisValidation';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';

@Pipe({
  name: 'invalidAnalysis',
  standalone: false,
})
export class InvalidAnalysisPipe implements PipeTransform {

  constructor(private predictorDataDbService: PredictorDataDbService,
    private facilityDbService: FacilitydbService
  ) { }

  transform(analysisItem: IdbAnalysisItem, calendarizedMeters: Array<CalanderizedMeter>): AnalysisSetupErrors {
    let facility: IdbFacility = this.facilityDbService.getFacilityById(analysisItem.facilityId);
    let facilityPredictorData: Array<IdbPredictorData> = this.predictorDataDbService.getByFacilityId(facility.guid);
    return getAnalysisSetupErrors(analysisItem, calendarizedMeters, facility, facilityPredictorData);
  }

}
