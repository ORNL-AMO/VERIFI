import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { IdbAnalysisItem, IdbFacility, IdbPredictorEntry, PredictorData } from 'src/app/models/idb';
import { Subscription } from 'rxjs';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { WeatherDataService } from 'src/app/weather-data/weather-data.service';
import { DegreeDaysService } from 'src/app/shared/helper-services/degree-days.service';
import { WeatherStation } from 'src/app/models/degreeDays';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { AnalysisGroup, JStatRegressionModel } from 'src/app/models/analysis';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';


@Component({
  selector: 'app-predictors-table',
  templateUrl: './predictors-table.component.html',
  styleUrls: ['./predictors-table.component.css']
})
export class PredictorsTableComponent {

  facilityPredictorsSub: Subscription;
  facilityPredictors: Array<PredictorData>;
  selectedFacilitySub: Subscription;
  selectedFacility: IdbFacility;
  predictorToDelete: PredictorData;

  standardPredictors: Array<PredictorData>;
  degreeDayPredictors: Array<PredictorData>;

  hasWeatherDataWarning: boolean;
  predictorUsedGroupIds: Array<string> = [];
  constructor(private predictorDbService: PredictordbService, private router: Router,
    private facilitydbService: FacilitydbService, private loadingService: LoadingService,
    private weatherDataService: WeatherDataService, private degreeDaysService: DegreeDaysService,
    private analysisDbService: AnalysisDbService,
    private accountAnalysisDbService: AccountAnalysisDbService) {

  }

  ngOnInit() {
    this.facilityPredictorsSub = this.predictorDbService.facilityPredictors.subscribe(val => {
      this.facilityPredictors = val;
      this.standardPredictors = new Array();
      this.degreeDayPredictors = new Array();
      let hasWeatherDataWarning: boolean = false;
      val.forEach(predictor => {
        if (predictor.predictorType == 'Standard' || predictor.predictorType == undefined) {
          this.standardPredictors.push(predictor);
        } else if (predictor.predictorType == 'Weather') {
          predictor.weatherDataWarning = this.checkWeatherPredictor(predictor);
          if (!hasWeatherDataWarning && predictor.weatherDataWarning) {
            hasWeatherDataWarning = true;
          }
          this.degreeDayPredictors.push(predictor);
        }
      })
      this.hasWeatherDataWarning = hasWeatherDataWarning;
    });
    this.selectedFacilitySub = this.facilitydbService.selectedFacility.subscribe(facility => {
      this.selectedFacility = facility;
    });
  }

  ngOnDestroy() {
    this.facilityPredictorsSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
  }

  selectDelete(predictor: PredictorData) {
    this.predictorToDelete = predictor;
    let facilityAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.facilityAnalysisItems.getValue();
    let allFacilityGroups: Array<AnalysisGroup> = facilityAnalysisItems.flatMap(item => { return item.groups });
    this.predictorUsedGroupIds = new Array();
    for (let i = 0; i < allFacilityGroups.length; i++) {
      let predictorVariables: Array<PredictorData> = [];
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
      let isUsed: PredictorData = predictorVariables.find(predictorUsed => { return predictorUsed.id == predictor.id });
      if(isUsed){
        this.predictorUsedGroupIds.push(group.idbGroupId)
      }
    };
  }


  async confirmDelete() {
    let deleteIndex: number = this.facilityPredictors.findIndex(facilityPredictor => { return facilityPredictor.id == this.predictorToDelete.id });
    this.facilityPredictors.splice(deleteIndex, 1);
    this.predictorToDelete = undefined;
    this.loadingService.setLoadingMessage('Deleting Predictor Data...');
    this.loadingService.setLoadingStatus(true);
    await this.analysisDbService.updateAnalysisPredictors(this.facilityPredictors, this.selectedFacility.guid, this.predictorUsedGroupIds);
    let accountAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    await this.accountAnalysisDbService.updateAccountValidation(accountAnalysisItems);
    await this.predictorDbService.updateFacilityPredictorEntries(this.facilityPredictors);
    this.loadingService.setLoadingStatus(false);

  }

  cancelDelete() {
    this.predictorToDelete = undefined;
  }


  selectEditPredictor(predictor: PredictorData) {
    this.router.navigateByUrl('facility/' + this.selectedFacility.id + '/utility/predictors/manage/edit-predictor/' + predictor.id);
  }

  addPredictor() {
    this.router.navigateByUrl('facility/' + this.selectedFacility.id + '/utility/predictors/manage/add-predictor');
  }

  uploadData() {
    this.router.navigateByUrl('/upload');
  }


  async viewWeatherData(predictor: PredictorData) {
    let weatherStation: WeatherStation = await this.degreeDaysService.getStationById(predictor.weatherStationId);
    this.weatherDataService.selectedStation = weatherStation;
    if (predictor.weatherDataType == 'CDD') {
      this.weatherDataService.coolingTemp = predictor.coolingBaseTemperature;
      let predictorPair: PredictorData = this.degreeDayPredictors.find(predictorPair => { return predictorPair.weatherStationId == predictor.weatherStationId && predictorPair.weatherDataType == 'HDD' });
      if (predictorPair) {
        this.weatherDataService.heatingTemp = predictorPair.heatingBaseTemperature;
        this.weatherDataService.weatherDataSelection = 'degreeDays';
      } else {
        this.weatherDataService.weatherDataSelection = 'CDD';
      }
    } else {
      this.weatherDataService.heatingTemp = predictor.heatingBaseTemperature;
      let predictorPair: PredictorData = this.degreeDayPredictors.find(predictorPair => { return predictorPair.weatherStationId == predictor.weatherStationId && predictorPair.weatherDataType == 'CDD' });
      if (predictorPair) {
        this.weatherDataService.coolingTemp = predictorPair.coolingBaseTemperature;
        this.weatherDataService.weatherDataSelection = 'degreeDays';
      } else {
        this.weatherDataService.weatherDataSelection = 'HDD';
      }
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

  checkWeatherPredictor(predictor: PredictorData): boolean {
    let facilityPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.facilityPredictorEntries.getValue();
    let allPredictorData: Array<PredictorData> = facilityPredictorEntries.flatMap(entry => { return entry.predictors });
    let findError: PredictorData = allPredictorData.find(data => {
      return data.id == predictor.id && data.weatherDataWarning;
    });
    return findError != undefined;
  }

  goToWeatherData() {
    let facility: IdbFacility = this.facilitydbService.selectedFacility.getValue();
    this.weatherDataService.selectedFacility = facility;
    this.router.navigateByUrl('/weather-data');
  }

}
