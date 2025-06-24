import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { WeatherStation } from 'src/app/models/degreeDays';
import { Router } from '@angular/router';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { WeatherDataService } from 'src/app/weather-data/weather-data.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { EditPredictorFormService } from '../edit-predictor-form.service';
import * as _ from 'lodash';
import { getWeatherSearchFromFacility } from '../../sharedHelperFuntions';

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


  displaySationModal: boolean = false;
  constructor(
    private router: Router, private facilityDbService: FacilitydbService,
    private weatherDataService: WeatherDataService,
    private editPredictorFormService: EditPredictorFormService) {
  }

  ngOnInit() {
    if (!this.facility) {
      this.facility = this.facilityDbService.getFacilityById(this.predictor.facilityId);
    }
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
    let weatherStation: WeatherStation | "error" = await this.weatherDataService.getStation(this.predictor.weatherStationId);
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
