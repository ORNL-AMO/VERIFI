import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { IdbAccount, IdbFacility, IdbPredictorEntry, PredictorData } from 'src/app/models/idb';
import { DegreeDaysService } from 'src/app/shared/helper-services/degree-days.service';
import * as _ from 'lodash';
import { DetailDegreeDay } from 'src/app/models/degreeDays';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { WeatherDataService } from 'src/app/weather-data/weather-data.service';
import { firstValueFrom, Observable, of } from 'rxjs';
@Component({
  selector: 'app-edit-predictor-entry',
  templateUrl: './edit-predictor-entry.component.html',
  styleUrls: ['./edit-predictor-entry.component.css']
})
export class EditPredictorEntryComponent {

  addOrEdit: 'add' | 'edit';
  predictorEntry: IdbPredictorEntry;
  hasWeatherData: boolean;
  calculatingDegreeDays: boolean;
  hasWeatherDataWarning: boolean;
  hasWeatherOverride: boolean;
  isSaved: boolean = true;
  constructor(private activatedRoute: ActivatedRoute, private predictorDbService: PredictordbService,
    private router: Router, private facilityDbService: FacilitydbService,
    private accountDbService: AccountdbService, private dbChangesService: DbChangesService,
    private degreeDaysService: DegreeDaysService,
    private loadingService: LoadingService,
    private toastNotificationService: ToastNotificationsService,
    private weatherDataService: WeatherDataService) {
  }

  ngOnInit() {
    this.activatedRoute.params.subscribe(params => {
      let predictorId: string = params['id'];
      if (predictorId) {
        this.addOrEdit = 'edit';
        this.setPredictorEntryEdit(predictorId);
      } else {
        this.addOrEdit = 'add';
        this.setNewPredictorEntry();
      }
      this.setHasWeatherData();
      this.setDegreeDayValues();
    });
  }



  cancel() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('facility/' + selectedFacility.id + '/utility/predictors/entries/predictor-entries-table')
  }

  async saveChanges() {
    this.loadingService.setLoadingMessage('Savings Predictor Entry...');
    this.loadingService.setLoadingStatus(true);
    if (this.addOrEdit == "edit") {
      await firstValueFrom(this.predictorDbService.updateWithObservable(this.predictorEntry));
    } else {
      await firstValueFrom(this.predictorDbService.addWithObservable(this.predictorEntry));
    }
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    await this.dbChangesService.setPredictors(selectedAccount, selectedFacility);
    this.isSaved = true;
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast('Predictors Updated!', undefined, undefined, false, 'alert-success');
    this.cancel();
  }

  setPredictorEntryEdit(predictorId: string) {
    let facilityPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.facilityPredictorEntries.getValue();
    let predictorEntry: IdbPredictorEntry = facilityPredictorEntries.find(entry => { return entry.guid == predictorId });
    console.log(predictorEntry);
    this.predictorEntry = JSON.parse(JSON.stringify(predictorEntry));
  }

  setNewPredictorEntry() {
    this.predictorEntry = this.predictorDbService.getNewPredictorEntry();
  }

  setDate(eventData: string) {
    //eventData format = yyyy-mm = 2022-06
    let yearMonth: Array<string> = eventData.split('-');
    //-1 on month
    this.predictorEntry.date = new Date(Number(yearMonth[0]), Number(yearMonth[1]) - 1, 1);
    this.isSaved = false;
    this.setDegreeDayValues();
  }

  setHasWeatherData() {
    this.hasWeatherData = this.predictorEntry.predictors.find(predictor => {
      return predictor.predictorType == 'Weather';
    }) != undefined;
  }

  async setDegreeDayValues() {
    this.calculatingDegreeDays = true;
    let degreeDayPredictors: Array<PredictorData> = this.predictorEntry.predictors.filter(predictor => { return predictor.predictorType == 'Weather' });
    let updatedPredictorIds: Array<string> = [];
    let hasWeatherDataWarning: boolean = false;
    let hasWeatherOverride: boolean = false;
    for (let i = 0; i < degreeDayPredictors.length; i++) {
      let predictor: PredictorData = degreeDayPredictors[i];
      if (!predictor.weatherOverride) {
        if (!updatedPredictorIds.includes(predictor.id)) {
          let degreeDayPair: PredictorData = degreeDayPredictors.find(predictorPair => {
            return predictorPair.weatherStationId == predictor.weatherStationId && predictorPair.weatherDataType != predictor.weatherDataType && !updatedPredictorIds.includes(predictorPair.id);
          });
          let coolingBaseTemperature: number = 0;
          let heatingBaseTemperature: number = 0;
          let cddPredictor: PredictorData;
          let hddPredictor: PredictorData;
          let stationId: string = predictor.weatherStationId;
          if (predictor.weatherDataType == 'CDD') {
            cddPredictor = predictor;
            coolingBaseTemperature = predictor.coolingBaseTemperature;
          } else {
            hddPredictor = predictor;
            heatingBaseTemperature = predictor.heatingBaseTemperature;
          }
          if (degreeDayPair) {
            if (degreeDayPair.weatherDataType == 'CDD') {
              cddPredictor = degreeDayPair;
              coolingBaseTemperature = degreeDayPair.coolingBaseTemperature;
            } else {
              hddPredictor = degreeDayPair;
              heatingBaseTemperature = degreeDayPair.heatingBaseTemperature;
            }
          }
          let entryDate: Date = new Date(this.predictorEntry.date);
          let degreeDays: Array<DetailDegreeDay> = await this.degreeDaysService.getDailyDataFromMonth(entryDate.getMonth(), entryDate.getFullYear(), heatingBaseTemperature, coolingBaseTemperature, stationId)

          let hasErrors: DetailDegreeDay = degreeDays.find(degreeDay => {
            return degreeDay.gapInData == true
          });
          if (!hasWeatherDataWarning && hasErrors != undefined) {
            hasWeatherDataWarning = true;
          }

          if (cddPredictor) {
            let totalCDD: number = _.sumBy(degreeDays, 'coolingDegreeDay');
            let cddIndex: number = this.predictorEntry.predictors.findIndex(predictor => { return predictor.id == cddPredictor.id });
            this.predictorEntry.predictors[cddIndex].amount = totalCDD;
            this.predictorEntry.predictors[cddIndex].weatherStationId = degreeDays[0]?.stationId;
            this.predictorEntry.predictors[cddIndex].weatherStationName = degreeDays[0]?.stationName;
            this.predictorEntry.predictors[cddIndex].weatherDataWarning = hasErrors != undefined;
            updatedPredictorIds.push(cddPredictor.id);
          }

          if (hddPredictor) {
            let hddIndex: number = this.predictorEntry.predictors.findIndex(predictor => { return predictor.id == hddPredictor.id });
            let totalHDD: number = _.sumBy(degreeDays, 'heatingDegreeDay');
            this.predictorEntry.predictors[hddIndex].amount = totalHDD;
            this.predictorEntry.predictors[hddIndex].weatherStationId = degreeDays[0]?.stationId;
            this.predictorEntry.predictors[hddIndex].weatherStationName = degreeDays[0]?.stationName;
            this.predictorEntry.predictors[hddIndex].weatherDataWarning = hasErrors != undefined;
            updatedPredictorIds.push(hddPredictor.id);
          }
        }
      } else {
        hasWeatherOverride = true;
      }
    }
    this.calculatingDegreeDays = false;
    this.hasWeatherOverride = hasWeatherOverride;
    this.hasWeatherDataWarning = hasWeatherDataWarning;
  }

  goToWeatherData() {
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.weatherDataService.selectedFacility = facility;
    this.weatherDataService.zipCode = facility.zip;
    this.weatherDataService.selectedMonth = this.predictorEntry.date;
    this.weatherDataService.selectedYear = new Date(this.predictorEntry.date).getFullYear();
    this.router.navigateByUrl('/weather-data');
  }

  setChanged() {
    this.isSaved = false;
  }

  canDeactivate(): Observable<boolean> {
    if (!this.isSaved) {
      const result = window.confirm('There are unsaved changes! Are you sure you want to leave this page?');
      return of(result);
    }
    return of(true);
  }

  setWeatherManually() {
    this.predictorEntry.predictors.forEach(predictor => {
      if (predictor.predictorType == 'Weather') {
        predictor.weatherOverride = true;
        predictor.weatherDataWarning = false;
      }
    });
    this.hasWeatherDataWarning = false;
    this.hasWeatherOverride = true;
  }

  async revertManualWeatherData() {
    this.predictorEntry.predictors.forEach(predictor => {
      if (predictor.predictorType == 'Weather') {
        predictor.weatherOverride = false;
      }
    });
    await this.setDegreeDayValues();
  }
}
