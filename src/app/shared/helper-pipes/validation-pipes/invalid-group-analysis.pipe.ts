import { Pipe, PipeTransform } from '@angular/core';
import { AnalysisGroup } from 'src/app/models/analysis';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { getGroupErrors } from '../../validation/analysisValidation';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { CalanderizationService } from '../../helper-services/calanderization.service';
import { GroupAnalysisErrors } from 'src/app/models/validation';

@Pipe({
  name: 'invalidGroupAnalysis',
  standalone: false,
  pure: false
})
export class InvalidGroupAnalysisPipe implements PipeTransform {

  constructor(private predictorDataDbService: PredictorDataDbService,
    private calanderizationService: CalanderizationService
  ) { }

  transform(group: AnalysisGroup, analysisItem: IdbAnalysisItem): GroupAnalysisErrors {
    let facilityPredictorData: Array<IdbPredictorData> = this.predictorDataDbService.getByFacilityId(analysisItem.facilityId);
    let calendarizedMeters: Array<CalanderizedMeter> = this.calanderizationService.getCalanderizedMetersByGroupId(group.idbGroupId);
    return getGroupErrors(group, analysisItem, calendarizedMeters, facilityPredictorData);
  }

}
