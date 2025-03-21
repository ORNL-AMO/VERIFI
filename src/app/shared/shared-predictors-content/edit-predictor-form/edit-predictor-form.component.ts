import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { WeatherStation } from 'src/app/models/degreeDays';
import { Router } from '@angular/router';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { getWeatherStation, WeatherDataService } from 'src/app/weather-data/weather-data.service';
// import { DegreeDaysService } from 'src/app/shared/helper-services/degree-days.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { EditPredictorFormService } from '../edit-predictor-form.service';
import { firstValueFrom } from 'rxjs';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import * as _ from 'lodash';

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
  constructor(
    private router: Router, private facilityDbService: FacilitydbService,
    private weatherDataService: WeatherDataService,
    // private degreeDaysService: DegreeDaysService,
    private editPredictorFormService: EditPredictorFormService,
    private dbChangesService: DbChangesService) {
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
    this.weatherDataService.getStationsAPI(this.facility.zip, 50).subscribe(results => {
      this.stations = JSON.parse(results).stations.map(station => {
        return getWeatherStation(station)
      });
      this.stations = _.orderBy(this.stations, (station: WeatherStation) => {
        return station.distanceFrom;
      })
      this.findingStations = false;
    });
  }

  goToWeatherData() {
    this.weatherDataService.zipCode = this.facility.zip;
    let weatherStation: WeatherStation = this.stations.find(station => {
      return station.ID == this.predictorForm.controls.weatherStationId.value
    });
    this.weatherDataService.selectedStation = weatherStation;
    if (this.predictorForm.controls.weatherDataType.value == 'CDD') {
      this.weatherDataService.coolingTemp = this.predictorForm.controls.coolingBaseTemperature.value;
    } else if (this.predictorForm.controls.weatherDataType.value == 'HDD') {
      this.weatherDataService.heatingTemp = this.predictorForm.controls.heatingBaseTemperature.value;
    }
    this.weatherDataService.weatherDataSelection = this.predictorForm.controls.weatherDataType.value;

    this.weatherDataService.selectedFacility = this.facility;
    this.weatherDataService.zipCode = this.facility.zip;
    if (weatherStation) {
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

  setWeatherStation() {
    this.predictor.weatherStationName = this.stations.find(station => {
      return station.ID == this.predictor.weatherStationId;
    })?.name;
  }

  openFacilityZipModal() {
    this.facilityZip = this.facility.zip;
    this.displayFacilityZipModal = true;
  }

  closeFacilityZipModal() {
    this.displayFacilityZipModal = false;
  }

  async setFacilityZip() {
    this.facility.zip = this.facilityZip;
    await firstValueFrom(this.facilityDbService.updateWithObservable(this.facility));
    await this.dbChangesService.selectFacility(this.facility);
    this.closeFacilityZipModal();
    this.setStations();
  }
}
