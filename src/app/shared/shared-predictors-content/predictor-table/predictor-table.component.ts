import { Component, computed, inject, Signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { AnalysisGroup, AnalysisGroupPredictorVariable, JStatRegressionModel } from 'src/app/models/analysis';
import { WeatherStation } from 'src/app/models/degreeDays';
import { getNewIdbPredictor, IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { WeatherDataService } from 'src/app/weather-data/weather-data.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { getGUID, getWeatherSearchFromFacility } from 'src/app/shared/sharedHelperFunctions';
import { PredictorDataHelperService, PredictorTableItem } from 'src/app/shared/helper-services/predictor-data-helper.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { PredictorStatusCheck } from 'src/app/calculations/status-check-calculations/predictorStatusCheck';
import { AccountStatusCheckService } from '../../helper-services/account-status-check.service';
import { FacilityStatusCheck } from 'src/app/calculations/status-check-calculations/facilityStatusCheck';

interface PredictorListItem {
  predictor: IdbPredictor,
  statusCheck: PredictorStatusCheck,
}

@Component({
  selector: 'app-predictor-table',
  templateUrl: './predictor-table.component.html',
  styleUrl: './predictor-table.component.css',
  standalone: false
})
export class PredictorTableComponent {
  private predictorDbService: PredictorDbService = inject(PredictorDbService);
  private router: Router = inject(Router);
  private facilitydbService: FacilitydbService = inject(FacilitydbService);
  private loadingService: LoadingService = inject(LoadingService);
  private weatherDataService: WeatherDataService = inject(WeatherDataService);
  private analysisDbService: AnalysisDbService = inject(AnalysisDbService);
  private dbChangesService: DbChangesService = inject(DbChangesService);
  private toastNotificationService: ToastNotificationsService = inject(ToastNotificationsService);
  private accountDbService: AccountdbService = inject(AccountdbService);
  private predictorDataDbService: PredictorDataDbService = inject(PredictorDataDbService);
  private predictorDataHelperService: PredictorDataHelperService = inject(PredictorDataHelperService);
  private accountStatusCheckService: AccountStatusCheckService = inject(AccountStatusCheckService);

  facilityPredictors: Signal<Array<IdbPredictor>> = toSignal(this.predictorDbService.facilityPredictors, { initialValue: [] });
  selectedFacility: Signal<IdbFacility> = toSignal(this.facilitydbService.selectedFacility, { initialValue: undefined });
  facilityStatusCheck: Signal<FacilityStatusCheck> = toSignal(this.accountStatusCheckService.selectedFacilityStatusCheck$);
  facilities: Signal<Array<IdbFacility>> = toSignal(this.facilitydbService.accountFacilities, { initialValue: [] });

  predictorToDelete: IdbPredictor;
  predictorToCopy: IdbPredictor;

  standardPredictors: Signal<Array<PredictorListItem>> = computed(() => {
    const predictors = this.facilityPredictors();
    const facilityStatusCheck = this.facilityStatusCheck();
    if (!predictors || !facilityStatusCheck) return [];
    return predictors.filter(predictor => predictor.predictorType == 'Standard').map(predictor => {
      return {
        predictor: predictor,
        statusCheck: facilityStatusCheck.predictorsStatusChecks.find(check => check.predictorId == predictor.guid)
      }
    });
  });
  degreeDayPredictors: Signal<Array<PredictorListItem>> = computed(() => {
    const predictors = this.facilityPredictors();
    const facilityStatusCheck = this.facilityStatusCheck();
    if (!predictors || !facilityStatusCheck) return [];
    return predictors.filter(predictor => predictor.predictorType == 'Weather').map(predictor => {
      return {
        predictor: predictor,
        statusCheck: facilityStatusCheck.predictorsStatusChecks.find(check => check.predictorId == predictor.guid)
      }
    });
  });

  hasWeatherDataWarning: Signal<boolean> = computed(() => {
    const degreeDayPredictorsList = this.degreeDayPredictors();
    if (!degreeDayPredictorsList) return false;
    return degreeDayPredictorsList.some(item => item.statusCheck && item.statusCheck.hasWeatherDataWarning);
  });
  
  predictorUsedGroupIds: Array<string> = [];
  displayDeletePredictor: boolean = false;
  selectedCopyFacilityGuid: string;
  displayCopyModal: boolean = false;
  constructor(
  ) {

  }

  // ngOnInit() {
  //   // this.facilities = this.facilitydbService.accountFacilities.getValue();
  //   // this.selectedFacilitySub = this.facilitydbService.selectedFacility.subscribe(facility => {
  //   //   this.selectedFacility = facility;
  //   // });
  //   // this.facilityPredictorsSub = this.predictorDbService.facilityPredictors.subscribe(val => {
  //   //   this.setPredictors(val);
  //   // });
  // }

  // ngOnDestroy() {
  //   this.facilityPredictorsSub.unsubscribe();
  //   this.selectedFacilitySub.unsubscribe();
  // }

  selectDelete(predictor: IdbPredictor) {
    this.predictorToDelete = predictor;
    //check if predictor is used in analysis.
    let facilityAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.facilityAnalysisItems.getValue();
    let allFacilityGroups: Array<AnalysisGroup> = facilityAnalysisItems.flatMap(item => { return item.groups });
    this.predictorUsedGroupIds = new Array();
    for (let i = 0; i < allFacilityGroups.length; i++) {
      let predictorVariables: Array<AnalysisGroupPredictorVariable> = [];
      let group: AnalysisGroup = allFacilityGroups[i];
      if (group.analysisType == 'regression') {
        if (group.selectedModelId) {
          let selectedModel: JStatRegressionModel = group.models.find(model => { return model.modelId == group.selectedModelId });
          predictorVariables = selectedModel.predictorVariables;
        } else {
          predictorVariables = group.predictorVariables.filter(variable => {
            return (variable.productionInAnalysis == true);
          });
        }
      } else if (group.analysisType != 'absoluteEnergyConsumption') {
        predictorVariables = group.predictorVariables.filter(variable => {
          return (variable.productionInAnalysis == true);
        });
      }
      let isUsed: AnalysisGroupPredictorVariable = predictorVariables.find(predictorUsed => { return predictorUsed.id == predictor.guid });
      if (isUsed) {
        this.predictorUsedGroupIds.push(group.idbGroupId)
      }
    };
    this.displayDeletePredictor = true;
  }

  async confirmDelete() {
    this.loadingService.setLoadingMessage('Deleting Predictor Data...');
    this.loadingService.setLoadingStatus(true);
    this.displayDeletePredictor = false;
    //delete predictor
    await firstValueFrom(this.predictorDbService.deleteWithObservable(this.predictorToDelete.id));
    //delete predictor data
    let predictorData: Array<IdbPredictorData> = this.predictorDataDbService.getByPredictorId(this.predictorToDelete.guid);
    await this.predictorDataDbService.deletePredictorDataAsync(predictorData);
    //set values in services
    const selectedFacility = this.selectedFacility();
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setPredictorsV2(account, selectedFacility);
    await this.dbChangesService.setPredictorDataV2(account, true, selectedFacility);
    //update analysis items
    this.loadingService.setLoadingMessage('Updating analysis items...');
    await this.analysisDbService.deleteAnalysisPredictor(this.predictorToDelete);
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast('Predictor Deleted', undefined, 1000, false, 'alert-success');
    this.cancelDelete();

  }

  cancelDelete() {
    this.displayDeletePredictor = false;
    this.predictorToDelete = undefined;
  }

  async selectEditPredictor(predictor: IdbPredictor) {
    const facility: IdbFacility = this.selectedFacility();
    if (this.router.url.includes('data-management')) {
      predictor.sidebarOpen = true;
      await firstValueFrom(this.predictorDbService.updateWithObservable(predictor));
      const account: IdbAccount = this.accountDbService.selectedAccount.getValue();
      await this.dbChangesService.setPredictorsV2(account, facility);
      this.router.navigateByUrl('/data-management/' + predictor.accountId + '/facilities/' + predictor.facilityId + '/predictors/' + predictor.guid);
    } else {
      this.router.navigateByUrl('/data-evaluation/facility/' + facility.guid + '/utility/predictors/manage/edit-predictor/' + predictor.guid);
    }
  }

  async addPredictor() {
    const facility: IdbFacility = this.selectedFacility();
    if (this.router.url.includes('data-management')) {
      let newPredictor: IdbPredictor = getNewIdbPredictor(facility.accountId, facility.guid);
      newPredictor = await firstValueFrom(this.predictorDbService.addWithObservable(newPredictor));
      await this.analysisDbService.addAnalysisPredictor(newPredictor);
      let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
      await this.dbChangesService.setPredictorsV2(account, facility);
      await this.dbChangesService.setPredictorDataV2(account, true, facility);
      await this.dbChangesService.setAnalysisItems(account, true, facility);
      this.loadingService.setLoadingStatus(false);
      this.toastNotificationService.showToast('New Predictor Added!', undefined, undefined, false, 'alert-success');
      this.selectEditPredictor(newPredictor);
    } else {
      this.router.navigateByUrl('/data-evaluation/facility/' + facility.guid + '/utility/predictors/manage/add-predictor');
    }
  }

  uploadData() {
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    this.router.navigateByUrl('/data-management/' + selectedAccount.guid + '/import-data');
  }


  async viewWeatherData(predictor: IdbPredictor) {
    const degreeDayPredictors = this.degreeDayPredictors();
    //ISSUE 1822
    // let weatherStation: WeatherStation | 'error' = await this.degreeDaysService.getStationById(predictor.weatherStationId)
    let weatherStation: WeatherStation | 'error' = await this.weatherDataService.getStation(predictor.weatherStationId);
    if (weatherStation && weatherStation != 'error') {
      this.weatherDataService.selectedStation = weatherStation;
      if (predictor.weatherDataType == 'CDD') {
        this.weatherDataService.coolingTemp = predictor.coolingBaseTemperature;
        let predictorPair: IdbPredictor = degreeDayPredictors.find(predictorPair => { return predictorPair.predictor.weatherStationId == predictor.weatherStationId && predictorPair.predictor.weatherDataType == 'HDD' })?.predictor;
        if (predictorPair) {
          this.weatherDataService.heatingTemp = predictorPair.heatingBaseTemperature;
          this.weatherDataService.weatherDataSelection = 'degreeDays';
        } else {
          this.weatherDataService.weatherDataSelection = 'CDD';
        }
      } else if (predictor.weatherDataType == 'HDD') {
        this.weatherDataService.heatingTemp = predictor.heatingBaseTemperature;
        let predictorPair: IdbPredictor = degreeDayPredictors.find(predictorPair => { return predictorPair.predictor.weatherStationId == predictor.weatherStationId && predictorPair.predictor.weatherDataType == 'CDD' })?.predictor;
        if (predictorPair) {
          this.weatherDataService.coolingTemp = predictorPair.coolingBaseTemperature;
          this.weatherDataService.weatherDataSelection = 'degreeDays';
        } else {
          this.weatherDataService.weatherDataSelection = 'HDD';
        }
      } else if (predictor.weatherDataType == 'relativeHumidity') {
        this.weatherDataService.weatherDataSelection = 'relativeHumidity';
      } else if (predictor.weatherDataType == 'dryBulbTemp') {
        this.weatherDataService.weatherDataSelection = 'dryBulbTemp';
      }
      let endDate: Date = new Date(weatherStation.end);
      endDate.setFullYear(endDate.getFullYear() - 1);
      this.weatherDataService.selectedYear = endDate.getFullYear();
      this.weatherDataService.selectedDate = endDate;
      this.weatherDataService.selectedMonth = endDate;
    }
    const selectedFacility = this.selectedFacility();
    this.weatherDataService.selectedFacility = selectedFacility;
    this.weatherDataService.addressSearchStr = getWeatherSearchFromFacility(selectedFacility);
    if (this.router.url.includes('data-management')) {
      this.router.navigateByUrl('/data-management/' + selectedFacility.accountId + '/weather-data/annual-station');
    } else {
      this.router.navigateByUrl('/data-evaluation/weather-data/annual-station');
    }
  }

  // checkWeatherPredictor(predictor: IdbPredictor): boolean {
  //   let predictorData: Array<IdbPredictorData> = this.predictorDataDbService.getByPredictorId(predictor.guid);
  //   let findError: IdbPredictorData = predictorData.find(data => {
  //     return data.id == predictor.id && data.weatherDataWarning;
  //   });
  //   return findError != undefined;
  // }

  goToWeatherData() {
    const selectedFacility = this.selectedFacility();
    this.weatherDataService.selectedFacility = selectedFacility;
    this.weatherDataService.addressSearchStr = getWeatherSearchFromFacility(selectedFacility);
    if (this.router.url.includes('data-management')) {
      this.router.navigateByUrl('/data-management/' + selectedFacility.accountId + '/weather-data');
    } else {
      this.router.navigateByUrl('/data-evaluation/weather-data');
    }
  }

  navigateToPredictorData(predictor: IdbPredictor) {
    const facility = this.selectedFacility();
    if (this.router.url.includes('data-management')) {
      this.router.navigateByUrl(`/data-management/${predictor.accountId}/facilities/${predictor.facilityId}/predictors/${predictor.guid}/predictor-data`);
    } else {
      this.router.navigateByUrl(`/data-evaluation/facility/${facility.guid}/utility/predictors/predictor/${predictor.guid}/entries-table`);
    }
  }

  selectCopy(predictor: IdbPredictor) {
    this.predictorToCopy = predictor;
    // this.facilities = this.facilitydbService.accountFacilities.getValue().filter(facility => {
    //   return facility.guid != this.predictorToCopy.facilityId
    // });
    this.displayCopyModal = true;
  }

  cancelCopy() {
    this.displayCopyModal = false;
    this.predictorToCopy = undefined;
  }

  async confirmCopy() {
    this.displayCopyModal = false;
    this.loadingService.setLoadingMessage("Copying Predictor Data...")
    this.loadingService.setLoadingStatus(true);
    let predictorData: Array<IdbPredictorData> = this.predictorDataDbService.getByPredictorId(this.predictorToCopy.guid);
    let newPredictor: IdbPredictor = JSON.parse(JSON.stringify(this.predictorToCopy));
    delete newPredictor.id;
    newPredictor.guid = getGUID();
    newPredictor.facilityId = this.selectedCopyFacilityGuid;
    newPredictor.name = newPredictor.name + " (copy)";
    await firstValueFrom(this.predictorDbService.addWithObservable(newPredictor));
    await this.analysisDbService.addAnalysisPredictor(newPredictor);
    for (let i = 0; i < predictorData.length; i++) {
      let newPredictorData: IdbPredictorData = JSON.parse(JSON.stringify(predictorData[i]));
      delete newPredictorData.id;
      newPredictorData.guid = getGUID();
      newPredictorData.facilityId = this.selectedCopyFacilityGuid;
      newPredictorData.predictorId = newPredictor.guid;
      await firstValueFrom(this.predictorDataDbService.addWithObservable(newPredictorData));
    }
    const facility: IdbFacility = this.selectedFacility();
    // let facility: IdbFacility = this.facilities.find(facility => { return facility.guid == this.selectedCopyFacilityGuid });
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast("Predictor Copy Created", undefined, undefined, false, "alert-success");
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setPredictorsV2(account);
    await this.dbChangesService.setPredictorDataV2(account, true)
    await this.dbChangesService.selectFacility(facility);
    this.router.navigateByUrl('/data-evaluation/facility/' + facility.guid + '/utility/predictors/manage/predictor-table');
  }

  // setPredictors(facilityPredictors: Array<IdbPredictor>) {
  //   let predictorsNeedUpdate: Array<{ predictor: IdbPredictor, latestReadingDate: Date }> = this.predictorDataHelperService.checkWeatherPredictorsNeedUpdate(this.selectedFacility);
  //   this.facilityPredictors = facilityPredictors;
  //   this.standardPredictors = new Array();
  //   this.degreeDayPredictors = new Array();
  //   let hasWeatherDataWarning: boolean = false;
  //   facilityPredictors.forEach(predictor => {
  //     let tableItem: PredictorTableItem = this.predictorDataHelperService.getPredictorTableItem(predictor, predictorsNeedUpdate);
  //     if (predictor.predictorType == 'Standard' || predictor.predictorType == undefined) {
  //       this.standardPredictors.push(tableItem);
  //     } else if (predictor.predictorType == 'Weather') {
  //       predictor.weatherDataWarning = this.checkWeatherPredictor(predictor);
  //       if (!hasWeatherDataWarning && predictor.weatherDataWarning) {
  //         hasWeatherDataWarning = true;
  //       }
  //       this.degreeDayPredictors.push(tableItem);
  //     }
  //   })
  //   this.hasWeatherDataWarning = hasWeatherDataWarning;
  //   if (predictorsNeedUpdate.length > 0) {
  //     this.hasUpdateWarning = this.predictorDataHelperService.getLastMeterDate(this.selectedFacility);
  //   }
  // }


}

