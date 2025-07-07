import { Component, Input, SimpleChanges } from '@angular/core';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
// import { DegreeDaysService } from '../../helper-services/degree-days.service';
import { DetailDegreeDay, WeatherStation } from 'src/app/models/degreeDays';
import { getDegreeDayAmount, getWeatherSearchFromFacility } from '../../sharedHelperFuntions';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { WeatherDataService } from 'src/app/weather-data/weather-data.service';
import { ActivatedRoute, Router } from '@angular/router';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
  selector: 'app-edit-predictor-data-entry-form',
  templateUrl: './edit-predictor-data-entry-form.component.html',
  styleUrl: './edit-predictor-data-entry-form.component.css',
  standalone: false
})
export class EditPredictorDataEntryFormComponent {
  @Input({ required: true })
  predictor: IdbPredictor;
  @Input({ required: true })
  predictorData: IdbPredictorData;
  @Input()
  isSaved: boolean;
  @Input()
  calculatingDegreeDays: boolean = false;

  constructor(
    // private degreeDaysService: DegreeDaysService,
    private facilityDbService: FacilitydbService,
    private weatherDataService: WeatherDataService,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {
  }

  ngOnInit() {
    this.setDegreeDayValues();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.predictorData && !changes.predictorData.firstChange) {
      this.setDegreeDayValues();
    }
  }

  setDate(eventData: string) {
    //eventData format = yyyy-mm = 2022-06
    let yearMonth: Array<string> = eventData.split('-');
    //-1 on month
    this.predictorData.date = new Date(Number(yearMonth[0]), Number(yearMonth[1]) - 1, 1);
    this.setDegreeDayValues();
  }

  async setDegreeDayValues() {
    if (this.predictor.predictorType == 'Weather') {
      this.calculatingDegreeDays = true;
      let hasWeatherDataWarning: boolean = false;
      if (!this.predictorData.weatherOverride) {
        let stationId: string = this.predictor.weatherStationId;
        let entryDate: Date = new Date(this.predictorData.date);
        let degreeDays: Array<DetailDegreeDay> | 'error' = await this.weatherDataService.getDegreeDaysForMonth(entryDate, this.predictor.weatherStationId, this.predictor.weatherStationName, this.predictor.heatingBaseTemperature, this.predictor.coolingBaseTemperature);
        // let degreeDays: 'error' | Array<DetailDegreeDay> = await this.degreeDaysService.getDailyDataFromMonth(entryDate.getMonth(), entryDate.getFullYear(), this.predictor.heatingBaseTemperature, this.predictor.coolingBaseTemperature, stationId)
        if (degreeDays != 'error') {
          let hasErrors: DetailDegreeDay = degreeDays.find(degreeDay => {
            return degreeDay.gapInData == true
          });
          if (!hasWeatherDataWarning && hasErrors != undefined || degreeDays.length == 0) {
            hasWeatherDataWarning = true;
          }
          this.predictorData.amount = getDegreeDayAmount(degreeDays, this.predictor.weatherDataType);
          this.predictorData.weatherDataWarning = hasErrors != undefined || degreeDays.length == 0;
        } else {
          this.predictorData.weatherDataWarning = true;
        }
      }
    }
    this.calculatingDegreeDays = false;
  }

  async goToWeatherData() {
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.weatherDataService.selectedFacility = facility;
    this.weatherDataService.selectedMonth = this.predictorData.date;
    this.weatherDataService.selectedYear = new Date(this.predictorData.date).getFullYear();

    if (this.predictor.weatherDataType == 'CDD') {
      this.weatherDataService.coolingTemp = this.predictor.coolingBaseTemperature;
    } else if (this.predictor.weatherDataType == 'HDD') {
      this.weatherDataService.heatingTemp = this.predictor.heatingBaseTemperature;
    }
    this.weatherDataService.weatherDataSelection = this.predictor.weatherDataType;
    this.weatherDataService.selectedFacility = facility;
    this.weatherDataService.addressSearchStr = getWeatherSearchFromFacility(facility);
    let weatherStation: WeatherStation | "error" = await this.weatherDataService.getStation(this.predictor.weatherStationId);
    if (weatherStation && weatherStation != 'error') {
      this.weatherDataService.selectedStation = weatherStation;
      let endDate: Date = new Date(weatherStation.end);
      endDate.setFullYear(endDate.getFullYear() - 1);
      this.weatherDataService.selectedYear = endDate.getFullYear();
      this.weatherDataService.selectedDate = endDate;
      this.weatherDataService.selectedMonth = endDate;
      if (this.router.url.includes('data-management')) {
        this.router.navigateByUrl('/data-management/' + this.predictor.accountId + '/weather-data/annual-station');
      } else {
        this.router.navigateByUrl('/weather-data/annual-station');
      }
    } else {
      if (this.router.url.includes('data-management')) {
        this.router.navigateByUrl('/data-management/' + this.predictor.accountId + '/weather-data');
      } else {
        this.router.navigateByUrl('/weather-data');
      }
    }

  }

  setChanged() {
    this.isSaved = false;
  }

  setWeatherManually() {
    if (this.predictor.predictorType == 'Weather') {
      this.predictorData.weatherOverride = true;
      this.predictorData.weatherDataWarning = false;
    }
  }

  async revertManualWeatherData() {
    if (this.predictor.predictorType == 'Weather') {
      this.predictorData.weatherOverride = false;
    }
    await this.setDegreeDayValues();
  }

}
