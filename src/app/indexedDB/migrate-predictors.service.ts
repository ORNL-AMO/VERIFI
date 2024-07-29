import { Injectable } from '@angular/core';
import { PredictordbService } from './predictors-db.service';
import { PredictorDbService } from './predictor-db.service';
import { PredictorDataDbService } from './predictor-data-db.service';
import { IdbAccount, IdbFacility, IdbPredictorEntry, PredictorData } from '../models/idb';
import { FacilitydbService } from './facility-db.service';
import { getNewIdbPredictor, IdbPredictor } from '../models/idbModels/predictor';
import { firstValueFrom } from 'rxjs';
import { getNewIdbPredictorData, IdbPredictorData } from '../models/idbModels/predictorData';
import { DbChangesService } from './db-changes.service';
import { AccountdbService } from './account-db.service';
import { LoadingService } from '../core-components/loading/loading.service';

@Injectable({
  providedIn: 'root'
})
export class MigratePredictorsService {

  constructor(
    private predictorDbServiceDeprecated: PredictordbService,
    private predictorDbService: PredictorDbService,
    private predictorDataDbService: PredictorDataDbService,
    private facilityDbService: FacilitydbService,
    private dbChangesSerice: DbChangesService,
    private accountDbService: AccountdbService,
    private loadingService: LoadingService
  ) { }

  async migrateAccountData() {
    this.loadingService.setLoadingMessage('MIGRATION INITIATED');
    this.loadingService.setLoadingStatus(true);
    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let predictorEntries: Array<IdbPredictorEntry> = this.predictorDbServiceDeprecated.accountPredictorEntries.getValue();
    for (let index = 0; index < facilities.length; index++) {
      let facility: IdbFacility = facilities[index];
      let facilityEntries: Array<IdbPredictorEntry> = predictorEntries.filter(entry => {
        return entry.facilityId == facility.guid;
      });
      if (facilityEntries.length > 0) {
        let predictorDataDep: Array<PredictorData> = facilityEntries[0].predictors;
        for (let i = 0; i < predictorDataDep.length; i++) {
          let oldPredictor: PredictorData = predictorDataDep[i];
          let newPredictor: IdbPredictor = getNewIdbPredictor(facility.accountId, facility.guid);
          newPredictor.guid = oldPredictor.id;
          newPredictor.name = oldPredictor.name;
          newPredictor.description = oldPredictor.name;
          newPredictor.production = oldPredictor.production;
          newPredictor.predictorType = oldPredictor.predictorType;
          newPredictor.weatherDataType = oldPredictor.weatherDataType;
          newPredictor.weatherStationId = oldPredictor.weatherStationId;
          newPredictor.weatherStationName = oldPredictor.weatherStationName;
          newPredictor.heatingBaseTemperature = oldPredictor.heatingBaseTemperature;
          newPredictor.coolingBaseTemperature = oldPredictor.coolingBaseTemperature;
          newPredictor.weatherDataWarning = oldPredictor.weatherDataWarning;
          await firstValueFrom(this.predictorDbService.addWithObservable(newPredictor));
          for (let entryIndex = 0; entryIndex < facilityEntries.length; entryIndex++) {
            let oldEntry: IdbPredictorEntry = facilityEntries[entryIndex];
            let oldEntryPredictor: PredictorData = oldEntry.predictors.find(predictor => {
              return predictor.id == newPredictor.guid
            });
            let newIdbPredictorData: IdbPredictorData = getNewIdbPredictorData(newPredictor, undefined);
            newIdbPredictorData.date = new Date(oldEntry.date);
            newIdbPredictorData.amount = oldEntryPredictor.amount;
            newIdbPredictorData.weatherDataWarning = oldEntryPredictor.weatherDataWarning;
            newIdbPredictorData.weatherOverride = oldEntryPredictor.weatherOverride;
            await firstValueFrom(this.predictorDataDbService.addWithObservable(newIdbPredictorData));
          }
        }
      }
    }
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    await this.dbChangesSerice.setPredictorsV2(account, selectedFacility);
    await this.dbChangesSerice.setPredictorDataV2(account, selectedFacility);
    this.loadingService.setLoadingStatus(false);
  }
}
