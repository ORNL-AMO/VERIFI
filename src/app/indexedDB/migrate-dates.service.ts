import { Injectable } from '@angular/core';
import { UtilityMeterDatadbService } from './utilityMeterData-db.service';
import { PredictorDataDbService } from './predictor-data-db.service';
import { IdbAccount } from '../models/idbModels/account';
import { LoadingService } from '../core-components/loading/loading.service';
import { firstValueFrom } from 'rxjs';
import { IdbPredictorData } from '../models/idbModels/predictorData';
import { IdbUtilityMeterData } from '../models/idbModels/utilityMeterData';
import { DbChangesService } from './db-changes.service';
// import { getStringFromDate } from '../shared/dateHelperFunctions';

@Injectable({
  providedIn: 'root',
})
export class MigrateDatesService {

  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService, private predictorDataDbService: PredictorDataDbService,
    private loadingService: LoadingService,
    private dbChangesService: DbChangesService
  ) { }

  async migrateDates(account: IdbAccount) {
    this.loadingService.setLoadingMessage('Migrating Meter Dates');
    this.loadingService.setLoadingStatus(true);
    let accountMeterData: Array<IdbUtilityMeterData> = await this.utilityMeterDataDbService.getAllAccountMeterData(account.guid);
    for (let meterData of accountMeterData) {
      if (!meterData.migratedDates) {
        meterData.month = meterData['readDate'].getMonth() + 1;
        meterData.year = meterData['readDate'].getFullYear();
        meterData.day = meterData['readDate'].getDate();
        meterData.migratedDates = true;
        await firstValueFrom(this.utilityMeterDataDbService.updateWithObservable(meterData));
      }
    }

    this.loadingService.setLoadingMessage('Migrating Predictor Dates');
    let accountPredictorData: Array<IdbPredictorData> = await this.predictorDataDbService.getAllAccountPredictorData(account.guid);
    for (let predictorData of accountPredictorData) {
      if (!predictorData.migratedDates) {
        // Format date as YYYY-MM-DD
        // predictorData.dateStr = getStringFromDate(predictorData['date']);
        predictorData.month = predictorData['date'].getMonth() + 1;
        predictorData.year = predictorData['date'].getFullYear();
        predictorData.migratedDates = true;
        await firstValueFrom(this.predictorDataDbService.updateWithObservable(predictorData));
      }
    }
    this.dbChangesService.selectAccount(account, true)
    this.loadingService.setLoadingStatus(false);
  }
}
