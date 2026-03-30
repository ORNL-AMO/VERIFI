import { Pipe, PipeTransform } from '@angular/core';
import { IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';
import { FacilityReportErrors } from 'src/app/models/validation';
import { CalanderizationService } from '../../helper-services/calanderization.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { getFacilityReportErrors } from '../../validation/facilityReportValidation';

@Pipe({
  name: 'invalidFacilityReport',
  standalone: false,
  pure: false
})
export class InvalidFacilityReportPipe implements PipeTransform {

  constructor(private predictorDataDbService: PredictorDataDbService,
    private facilityDbService: FacilitydbService,
    private calanderizationService: CalanderizationService,
    private analysisDbService: AnalysisDbService
  ) { }

  transform(facilityReport: IdbFacilityReport): FacilityReportErrors {
    let analysisItems: Array<IdbAnalysisItem> = this.analysisDbService.facilityAnalysisItems.getValue();
    let calendarizedMeters: Array<CalanderizedMeter> = this.calanderizationService.getCalanderizedMetersByFacilityID(facilityReport.facilityId);
    let facilityPredictorData: Array<IdbPredictorData> = this.predictorDataDbService.facilityPredictorData.getValue();
    let facility: IdbFacility = this.facilityDbService.getFacilityById(facilityReport.facilityId);
    return getFacilityReportErrors(facilityReport,
      analysisItems,
      calendarizedMeters,
      facilityPredictorData,
      facility);
  }

}
