import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { AnalysisGroup, AnalysisGroupPredictorVariable, JStatRegressionModel } from 'src/app/models/analysis';
import { WeatherStation } from 'src/app/models/degreeDays';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { DegreeDaysService } from 'src/app/shared/helper-services/degree-days.service';
import { WeatherDataService } from 'src/app/weather-data/weather-data.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { getGUID } from 'src/app/shared/sharedHelperFuntions';
import { PredictorDataHelperService, PredictorTableItem } from 'src/app/shared/helper-services/predictor-data-helper.service';

@Component({
  selector: 'app-predictor-table',
  templateUrl: './predictor-table.component.html',
  styleUrl: './predictor-table.component.css'
})
export class PredictorTableComponent {

  facilityPredictorsSub: Subscription;
  facilityPredictors: Array<IdbPredictor>;
  selectedFacilitySub: Subscription;
  selectedFacility: IdbFacility;
  predictorToDelete: IdbPredictor;
  predictorToCopy: IdbPredictor;

  standardPredictors: Array<PredictorTableItem>;
  degreeDayPredictors: Array<PredictorTableItem>;

  hasWeatherDataWarning: boolean;
  hasUpdateWarning: Date;
  predictorUsedGroupIds: Array<string> = [];
  displayDeletePredictor: boolean = false;
  facilities: Array<IdbFacility>;
  selectedCopyFacilityGuid: string;
  displayCopyModal: boolean = false;
  constructor(private predictorDbService: PredictorDbService, private router: Router,
    private facilitydbService: FacilitydbService, private loadingService: LoadingService,
    private weatherDataService: WeatherDataService, private degreeDaysService: DegreeDaysService,
    private analysisDbService: AnalysisDbService,
    private accountAnalysisDbService: AccountAnalysisDbService,
    private dbChangesService: DbChangesService,
    private toastNotificationService: ToastNotificationsService,
    private accountDbService: AccountdbService,
    private predictorDataDbService: PredictorDataDbService,
    private predictorDataHelperService: PredictorDataHelperService) {

  }

  ngOnInit() {
    this.facilities = this.facilitydbService.accountFacilities.getValue();
    this.selectedFacilitySub = this.facilitydbService.selectedFacility.subscribe(facility => {
      this.selectedFacility = facility;
    });
    this.facilityPredictorsSub = this.predictorDbService.facilityPredictors.subscribe(val => {
      this.setPredictors(val);
    });
  }

  ngOnDestroy() {
    this.facilityPredictorsSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
  }

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
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setPredictorsV2(account, this.selectedFacility);
    await this.dbChangesService.setPredictorDataV2(account, this.selectedFacility);
    if (this.predictorUsedGroupIds.length > 0) {
      //update analysis items
      this.loadingService.setLoadingMessage('Updating analysis items...');
      await this.analysisDbService.deleteAnalysisPredictor(this.predictorToDelete);
      let accountAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
      await this.accountAnalysisDbService.updateAccountValidation(accountAnalysisItems);
    }
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast('Predictor Deleted', undefined, 1000, false, 'alert-success');
    this.cancelDelete();

  }

  cancelDelete() {
    this.displayDeletePredictor = false;
    this.predictorToDelete = undefined;
  }

  selectEditPredictor(predictor: IdbPredictor) {
    this.router.navigateByUrl('facility/' + this.selectedFacility.id + '/utility/predictors/manage/edit-predictor/' + predictor.guid);
  }

  addPredictor() {
    this.router.navigateByUrl('facility/' + this.selectedFacility.id + '/utility/predictors/manage/add-predictor');
  }

  uploadData() {
    this.router.navigateByUrl('/upload');
  }


  async viewWeatherData(predictor: IdbPredictor) {
    let weatherStation: WeatherStation = await this.degreeDaysService.getStationById(predictor.weatherStationId);
    this.weatherDataService.selectedStation = weatherStation;
    if (predictor.weatherDataType == 'CDD') {
      this.weatherDataService.coolingTemp = predictor.coolingBaseTemperature;
      let predictorPair: IdbPredictor = this.degreeDayPredictors.find(predictorPair => { return predictorPair.predictor.weatherStationId == predictor.weatherStationId && predictorPair.predictor.weatherDataType == 'HDD' }).predictor;
      if (predictorPair) {
        this.weatherDataService.heatingTemp = predictorPair.heatingBaseTemperature;
        this.weatherDataService.weatherDataSelection = 'degreeDays';
      } else {
        this.weatherDataService.weatherDataSelection = 'CDD';
      }
    } else if (predictor.weatherDataType == 'HDD') {
      this.weatherDataService.heatingTemp = predictor.heatingBaseTemperature;
      let predictorPair: IdbPredictor = this.degreeDayPredictors.find(predictorPair => { return predictorPair.predictor.weatherStationId == predictor.weatherStationId && predictorPair.predictor.weatherDataType == 'CDD' }).predictor;
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
    this.weatherDataService.selectedFacility = this.selectedFacility;
    this.weatherDataService.zipCode = this.selectedFacility.zip;
    this.router.navigateByUrl('weather-data/annual-station')
  }

  checkWeatherPredictor(predictor: IdbPredictor): boolean {
    let predictorData: Array<IdbPredictorData> = this.predictorDataDbService.getByPredictorId(predictor.guid);
    let findError: IdbPredictorData = predictorData.find(data => {
      return data.id == predictor.id && data.weatherDataWarning;
    });
    return findError != undefined;
  }

  goToWeatherData() {
    let facility: IdbFacility = this.facilitydbService.selectedFacility.getValue();
    this.weatherDataService.selectedFacility = facility;
    this.weatherDataService.zipCode = facility.zip;
    this.router.navigateByUrl('/weather-data');
  }

  selectCopy(predictor: IdbPredictor) {
    this.predictorToCopy = predictor;
    this.facilities = this.facilitydbService.accountFacilities.getValue().filter(facility => {
      return facility.guid != this.predictorToCopy.facilityId
    });
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
    let facility: IdbFacility = this.facilities.find(facility => { return facility.guid == this.selectedCopyFacilityGuid });
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast("Predictor Copy Created", undefined, undefined, false, "alert-success");
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setPredictorsV2(account);
    await this.dbChangesService.setPredictorDataV2(account)
    await this.dbChangesService.selectFacility(facility);
    this.router.navigateByUrl('/facility/' + facility.id + '/utility/predictors/manage/predictor-table');
  }

  setPredictors(facilityPredictors: Array<IdbPredictor>) {
    let predictorsNeedUpdate: Array<{ predictor: IdbPredictor, latestReadingDate: Date }> = this.predictorDataHelperService.checkWeatherPredictorsNeedUpdate(this.selectedFacility);
    this.facilityPredictors = facilityPredictors;
    this.standardPredictors = new Array();
    this.degreeDayPredictors = new Array();
    let hasWeatherDataWarning: boolean = false;
    facilityPredictors.forEach(predictor => {
      let tableItem: PredictorTableItem = this.predictorDataHelperService.getPredictorTableItem(predictor, predictorsNeedUpdate);
      if (predictor.predictorType == 'Standard' || predictor.predictorType == undefined) {
        this.standardPredictors.push(tableItem);
      } else if (predictor.predictorType == 'Weather') {
        predictor.weatherDataWarning = this.checkWeatherPredictor(predictor);
        if (!hasWeatherDataWarning && predictor.weatherDataWarning) {
          hasWeatherDataWarning = true;
        }
        this.degreeDayPredictors.push(tableItem);
      }
    })
    this.hasWeatherDataWarning = hasWeatherDataWarning;
    if (predictorsNeedUpdate.length > 0) {
      this.hasUpdateWarning = this.predictorDataHelperService.getLastMeterDate(this.selectedFacility);
    }
  }


}

