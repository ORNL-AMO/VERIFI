import { Pipe, PipeTransform } from '@angular/core';
import { AnalysisSetupErrors } from 'src/app/models/validation';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { getAnalysisSetupErrors } from '../../validation/analysisValidation';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { CalanderizationService } from '../../helper-services/calanderization.service';

@Pipe({
  name: 'invalidAnalysis',
  standalone: false,
  pure: false
})
export class InvalidAnalysisPipe implements PipeTransform {

  constructor(private predictorDataDbService: PredictorDataDbService,
    private facilityDbService: FacilitydbService,
    private calanderizationService: CalanderizationService
  ) { }

  transform(analysisItem: IdbAnalysisItem): AnalysisSetupErrors {
    let facility: IdbFacility = this.facilityDbService.getFacilityById(analysisItem.facilityId);
    let facilityPredictorData: Array<IdbPredictorData> = this.predictorDataDbService.getByFacilityId(facility.guid);
    let calanderizedMeters: Array<CalanderizedMeter> = this.calanderizationService.getCalanderizedMetersByFacilityID(facility.guid);
    return getAnalysisSetupErrors(analysisItem, calanderizedMeters, facility, facilityPredictorData);
  }

}
