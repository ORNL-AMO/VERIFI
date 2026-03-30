import { Pipe, PipeTransform } from '@angular/core';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { getAccountAnalysisSetupErrors } from '../../validation/accountAnalysisValidation';
import { AccountAnalysisSetupErrors } from 'src/app/models/accountAnalysis';
import { CalanderizationService } from '../../helper-services/calanderization.service';

@Pipe({
  name: 'invalidAccountAnalysis',
  standalone: false,
  pure: false
})
export class InvalidAccountAnalysisPipe implements PipeTransform {

  constructor(private predictorDataDbService: PredictorDataDbService,
    private analysisDbService: AnalysisDbService,
    private facilityDbService: FacilitydbService,
    private calanderizationService: CalanderizationService
  ) { }

  transform(analysisItem: IdbAccountAnalysisItem): AccountAnalysisSetupErrors {
    let accountPredictorData: Array<IdbPredictorData> = this.predictorDataDbService.accountPredictorData.getValue();
    let allAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let calendarizedMeters: Array<CalanderizedMeter> = this.calanderizationService.getAccountCalanderizedMeters();
    return getAccountAnalysisSetupErrors(analysisItem, allAnalysisItems, calendarizedMeters, facilities, accountPredictorData);
  }

}
