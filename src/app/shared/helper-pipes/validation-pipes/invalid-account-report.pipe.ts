import { Pipe, PipeTransform } from '@angular/core';
import { AccountReportErrors } from 'src/app/models/validation';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { getAccountReportErrors } from '../../validation/accountReportValidation';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { CalanderizationService } from '../../helper-services/calanderization.service';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';

@Pipe({
  name: 'invalidAccountReport',
  standalone: false,
})
export class InvalidAccountReportPipe implements PipeTransform {

  constructor(private predictorDataDbService: PredictorDataDbService,
    private analysisDbService: AnalysisDbService,
    private facilityDbService: FacilitydbService,
    private calanderizationService: CalanderizationService,
    private accountAnalysisDbService: AccountAnalysisDbService
  ) { }

  transform(accountReport: IdbAccountReport): AccountReportErrors {
    let accountPredictorData: Array<IdbPredictorData> = this.predictorDataDbService.accountPredictorData.getValue();
    let allAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let calendarizedMeters: Array<CalanderizedMeter> = this.calanderizationService.getAccountCalanderizedMeters();
    let allAccountAnalysisItem: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    return getAccountReportErrors(accountReport, allAccountAnalysisItem, allAnalysisItems, calendarizedMeters, facilities, accountPredictorData);
  }

}
