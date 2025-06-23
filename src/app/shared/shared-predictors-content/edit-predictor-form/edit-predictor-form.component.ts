import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { DetailDegreeDay, WeatherStation } from 'src/app/models/degreeDays';
import { Router } from '@angular/router';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { getWeatherStation, WeatherDataReading, WeatherDataService } from 'src/app/weather-data/weather-data.service';
// import { DegreeDaysService } from 'src/app/shared/helper-services/degree-days.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { EditPredictorFormService } from '../edit-predictor-form.service';
import { firstValueFrom } from 'rxjs';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import * as _ from 'lodash';
import { getDegreeDayAmount, getWeatherSearchFromFacility } from '../../sharedHelperFuntions';
import { DatePipe } from '@angular/common';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { getDetailedDataForMonth } from 'src/app/weather-data/weatherDataCalculations';
import { getNewIdbPredictorData, IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';

@Component({
  selector: 'app-edit-predictor-form',
  templateUrl: './edit-predictor-form.component.html',
  styleUrl: './edit-predictor-form.component.css',
  standalone: false
})
export class EditPredictorFormComponent {
  @Input({ required: true })
  predictorForm: FormGroup;
  @Input({ required: true })
  predictor: IdbPredictor;
  @Input()
  addOrEdit: 'add' | 'edit';
  @Input()
  latestMeterReading: Date;
  @Input()
  firstMeterReading: Date;
  @Input()
  facility: IdbFacility;


  stations: Array<WeatherStation> = [];
  findingStations: boolean = false;
  destroyed: boolean;
  displayFacilityZipModal: boolean = false;
  facilityZip: string;

  displaySationModal: boolean = false;
  constructor(
    private router: Router, private facilityDbService: FacilitydbService,
    private weatherDataService: WeatherDataService,
    // private degreeDaysService: DegreeDaysService,
    private editPredictorFormService: EditPredictorFormService,
    private dbChangesService: DbChangesService,
    private loadingService: LoadingService,
    private toastNotificationService: ToastNotificationsService,
    private predictorDataDbService: PredictorDataDbService) {
  }

  ngOnInit() {
    if (!this.facility) {
      this.facility = this.facilityDbService.getFacilityById(this.predictor.facilityId);
    }
    if (this.predictor) {
      this.setStations();
    }
  }

  ngOnDestroy() {
    this.destroyed = true;
  }

  changePredictorType() {
    this.editPredictorFormService.setValidators(this.predictorForm);
  }

  setPredictorForm() {
    this.predictorForm = this.editPredictorFormService.getFormFromPredictor(this.predictor);
  }

  setValidators() {
    this.editPredictorFormService.setValidators(this.predictorForm);
  }

  setStations() {
    this.findingStations = true;
    // this.weatherDataService.getStationsAPI(this.facility.zip, 50).subscribe(results => {
    //   this.stations = JSON.parse(results).stations.map(station => {
    //     return getWeatherStation(station)
    //   });
    //   this.stations = _.orderBy(this.stations, (station: WeatherStation) => {
    //     return station.distanceFrom;
    //   })
    //   this.findingStations = false;
    // });
  }

  async goToWeatherData() {
    this.displaySationModal = false;
    if (this.predictorForm.controls.weatherDataType.value == 'CDD') {
      this.weatherDataService.coolingTemp = this.predictorForm.controls.coolingBaseTemperature.value;
    } else if (this.predictorForm.controls.weatherDataType.value == 'HDD') {
      this.weatherDataService.heatingTemp = this.predictorForm.controls.heatingBaseTemperature.value;
    }
    this.weatherDataService.weatherDataSelection = this.predictorForm.controls.weatherDataType.value;
    this.weatherDataService.selectedFacility = this.facility;
    this.weatherDataService.addressSearchStr = getWeatherSearchFromFacility(this.facility);
    let weatherStation: WeatherStation | "error" = await this.weatherDataService.getStation(this.predictorForm.controls.weatherStationId.value)
    if (weatherStation && weatherStation != 'error') {
      this.weatherDataService.selectedStation = weatherStation;
      let endDate: Date = new Date(weatherStation.end);
      endDate.setFullYear(endDate.getFullYear() - 1);
      this.weatherDataService.selectedYear = endDate.getFullYear();
      this.weatherDataService.selectedDate = endDate;
      this.weatherDataService.selectedMonth = endDate;
      this.router.navigateByUrl('/weather-data/annual-station');
    } else {
      this.router.navigateByUrl('/weather-data');
    }
  }

  async addWeatherData() {
    if (this.latestMeterReading && this.firstMeterReading) {
      let datePipe: DatePipe = new DatePipe(navigator.language);
      let stringFormat: string = 'MMM, yyyy';
      let startDate: Date = new Date(this.firstMeterReading);
      let endDate: Date = new Date(this.latestMeterReading);
      let parsedData: Array<WeatherDataReading> | 'error' = await this.weatherDataService.getHourlyData(this.predictor.weatherStationId, startDate, endDate, []);
      if (parsedData != 'error') {
        while (startDate <= endDate) {
          if (this.destroyed) {
            break;
          }
          let newDate: Date = new Date(startDate);
          let dateString = datePipe.transform(newDate, stringFormat);
          this.loadingService.setLoadingMessage('Adding Weather Predictors: ' + dateString);
          let degreeDays: Array<DetailDegreeDay> = getDetailedDataForMonth(parsedData, newDate.getMonth(), newDate.getFullYear(), this.predictor.heatingBaseTemperature, this.predictor.coolingBaseTemperature, this.predictor.weatherStationId, this.predictor.weatherStationName);
          //Issue 1822
          // await this.degreeDaysService.setYearHourlyData(newDate.getMonth(), newDate.getFullYear(), this.weatherDataService.selectedStation.ID)
          // let degreeDays: Array<DetailDegreeDay> = await this.degreeDaysService.getDetailedDataForMonth(newDate.getMonth(), this.predictor.heatingBaseTemperature, this.predictor.coolingBaseTemperature)
          let hasErrors: DetailDegreeDay = degreeDays.find(degreeDay => {
            return degreeDay.gapInData == true
          });
          let newPredictorData: IdbPredictorData = getNewIdbPredictorData(this.predictor);
          newPredictorData.date = newDate;
          newPredictorData.amount = getDegreeDayAmount(degreeDays, this.predictor.weatherDataType);
          newPredictorData.weatherDataWarning = hasErrors != undefined || degreeDays.length == 0;
          await firstValueFrom(this.predictorDataDbService.addWithObservable(newPredictorData));
          startDate.setMonth(startDate.getMonth() + 1);
        }
      } else {
        this.toastNotificationService.weatherDataErrorToast();
      }
    }
  }

  openStationModal() {
    this.displaySationModal = true;
  }

  cancelStationSelect() {
    this.displaySationModal = false;
  }

  selectStation(station: WeatherStation) {
    this.predictor.weatherStationId = station.ID;
    this.predictor.weatherStationName = station.name;
    this.predictorForm.controls['weatherStationId'].patchValue(station.ID);
    this.cancelStationSelect();
  }
}
