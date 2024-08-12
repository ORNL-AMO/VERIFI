import { Injectable } from '@angular/core';
import { PredictordbServiceDeprecated } from './predictors-deprecated-db.service';
import { PredictorDbService } from './predictor-db.service';
import { PredictorDataDbService } from './predictor-data-db.service';
import { IdbPredictorEntryDeprecated, PredictorDataDeprecated } from '../models/idb';
import { FacilitydbService } from './facility-db.service';
import { getNewIdbPredictor, IdbPredictor } from '../models/idbModels/predictor';
import { firstValueFrom } from 'rxjs';
import { getNewIdbPredictorData, IdbPredictorData } from '../models/idbModels/predictorData';
import { LoadingService } from '../core-components/loading/loading.service';
import { IdbFacility } from '../models/idbModels/facility';

@Injectable({
  providedIn: 'root'
})
export class MigratePredictorsService {

  constructor(
    private predictorDbServiceDeprecated: PredictordbServiceDeprecated,
    private predictorDbService: PredictorDbService,
    private predictorDataDbService: PredictorDataDbService,
    private facilityDbService: FacilitydbService,
    private loadingService: LoadingService
  ) { }

  async migrateAccountPredictors() {
    this.loadingService.setLoadingMessage('Predictors have been changed. Migrating to the new layout. This may take a moment and will only happen once.');
    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let predictorEntries: Array<IdbPredictorEntryDeprecated> = this.predictorDbServiceDeprecated.accountPredictorEntries.getValue();
    for (let index = 0; index < facilities.length; index++) {
      let facility: IdbFacility = facilities[index];
      let facilityEntries: Array<IdbPredictorEntryDeprecated> = predictorEntries.filter(entry => {
        return entry.facilityId == facility.guid;
      });
      if (facilityEntries.length > 0) {
        let predictorDataDep: Array<PredictorDataDeprecated> = facilityEntries[0].predictors;
        for (let i = 0; i < predictorDataDep.length; i++) {
          let oldPredictor: PredictorDataDeprecated = predictorDataDep[i];
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
            let oldEntry: IdbPredictorEntryDeprecated = facilityEntries[entryIndex];
            let oldEntryPredictor: PredictorDataDeprecated = oldEntry.predictors.find(predictor => {
              return predictor.id == newPredictor.guid
            });
            let newIdbPredictorData: IdbPredictorData = getNewIdbPredictorData(newPredictor, undefined);
            newIdbPredictorData.date = new Date(oldEntry.date);
            newIdbPredictorData.amount = oldEntryPredictor.amount;
            newIdbPredictorData.weatherDataWarning = oldEntryPredictor.weatherDataWarning;
            newIdbPredictorData.weatherOverride = oldEntryPredictor.weatherOverride;
            await firstValueFrom(this.predictorDataDbService.addWithObservable(newIdbPredictorData));
            await firstValueFrom(this.predictorDbServiceDeprecated.deleteIndexWithObservable(oldEntry.id));
          }
        }
      }
    }
    // let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    // let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    // await this.dbChangesSerice.setPredictorsV2(account, selectedFacility);
    // await this.dbChangesSerice.setPredictorDataV2(account, selectedFacility);
    // await this.dbChangesSerice.setPredictorsDeprecated(account, selectedFacility);
    // this.loadingService.setLoadingStatus(false);
  }
}
