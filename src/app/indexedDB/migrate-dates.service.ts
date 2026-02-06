import { Injectable } from '@angular/core';
import { UtilityMeterDatadbService } from './utilityMeterData-db.service';
import { PredictorDataDbService } from './predictor-data-db.service';
import { IdbAccount } from '../models/idbModels/account';
import { LoadingService } from '../core-components/loading/loading.service';
import { firstValueFrom } from 'rxjs';
import { IdbPredictorData } from '../models/idbModels/predictorData';
// import { getStringFromDate } from '../shared/dateHelperFunctions';

@Injectable({
  providedIn: 'root',
})
export class MigrateDatesService {

  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService, private predictorDataDbService: PredictorDataDbService,
    private loadingService: LoadingService
  ) { }

  async migrateDates(account: IdbAccount) {
    let accountMeterData = await this.utilityMeterDataDbService.getAllAccountMeterData(account.guid);
    for (let meterData of accountMeterData) {
      if (meterData['readDate'] && !meterData.readDateStr) {
        // Format date as YYYY-MM-DD
        // meterData.readDateStr = getStringFromDate(meterData['readDate']);
        delete meterData['readDate'];
        await firstValueFrom(this.utilityMeterDataDbService.updateWithObservable(meterData));
      }
    }
    let accountPredictorData: Array<IdbPredictorData> = await this.predictorDataDbService.getAllAccountPredictorData(account.guid);
    for (let predictorData of accountPredictorData) {
      if (predictorData['date'] && !predictorData.migratedDates) {
        // Format date as YYYY-MM-DD
        // predictorData.dateStr = getStringFromDate(predictorData['date']);
        predictorData.month = predictorData['date'].getMonth() + 1;
        predictorData.year = predictorData['date'].getFullYear();
        predictorData.migratedDates = true;
        delete predictorData['date'];
        await firstValueFrom(this.predictorDataDbService.updateWithObservable(predictorData));
      }
    }
  }
}
