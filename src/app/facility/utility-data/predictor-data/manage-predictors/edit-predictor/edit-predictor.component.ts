import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { IdbFacility, PredictorData } from 'src/app/models/idb';
import { ConvertUnitsService } from 'src/app/shared/convert-units/convert-units.service';
import { DegreeDaysService } from 'src/app/shared/helper-services/degree-days.service';
import { UnitConversionTypes } from './unitConversionTypes';
import { WeatherStation } from 'src/app/models/degreeDays';
import { WeatherDataService } from 'src/app/weather-data/weather-data.service';

@Component({
  selector: 'app-edit-predictor',
  templateUrl: './edit-predictor.component.html',
  styleUrls: ['./edit-predictor.component.css']
})
export class EditPredictorComponent {


  addOrEdit: 'add' | 'edit';
  predictorData: PredictorData;
  predictorForm: FormGroup;
  showReferencePredictors: boolean;
  referencePredictors: Array<PredictorData>;
  unitConversionTypes: Array<{ measure: string, display: string }> = UnitConversionTypes;
  unitOptions: Array<string> = [];
  referencePredictorName: string;
  stations: Array<WeatherStation> = [];
  facility: IdbFacility;
  constructor(private activatedRoute: ActivatedRoute, private predictorDbService: PredictordbService,
    private router: Router, private facilityDbService: FacilitydbService,
    private formBuilder: FormBuilder,
    private convertUnitsService: ConvertUnitsService,
    private weatherDataService: WeatherDataService,
    private degreeDaysService: DegreeDaysService) {
  }

  ngOnInit() {
    // this.noaaService.get();
    this.facility = this.facilityDbService.selectedFacility.getValue();
    // this.degreeDaysService.getHeatingDegreeDays(facility.zip, 0, 2022);

    this.activatedRoute.params.subscribe(params => {
      let predictorId: string = params['id'];
      if (predictorId) {
        this.addOrEdit = 'edit';
        this.setPredictorDataEdit(predictorId);
      } else {
        this.addOrEdit = 'add';
        this.setPredictorDataNew();
      }
      this.setReferencePredictors();
      this.setStations();
    });
  }

  setPredictorDataEdit(predictorId: string) {
    let facilityPredictors: Array<PredictorData> = this.predictorDbService.facilityPredictors.getValue();
    let predictorData: PredictorData = facilityPredictors.find(predictor => { return predictor.id == predictorId });
    this.predictorData = JSON.parse(JSON.stringify(predictorData));
    this.setPredictorForm();
  }

  setPredictorDataNew() {
    let facilityPredictors: Array<PredictorData> = this.predictorDbService.facilityPredictors.getValue();
    this.predictorData = this.predictorDbService.getNewPredictor(facilityPredictors);
    this.setPredictorForm();
  }

  changePredictorType(){
    this.setValidators();
    this.setShowReferencePredictors();
  }

  setPredictorForm() {
    this.predictorForm = this.formBuilder.group({
      'name': [this.predictorData.name, [Validators.required]],
      'unit': [this.predictorData.unit],
      'description': [this.predictorData.description],
      'production': [this.predictorData.production || false],
      'predictorType': [this.predictorData.predictorType],
      'referencePredictorId': [this.predictorData.referencePredictorId],
      'convertFrom': [this.predictorData.convertFrom],
      'convertTo': [this.predictorData.convertTo],
      'conversionType': [this.predictorData.conversionType],
      'mathAction': [],
      'mathAmount': [],
      'weatherDataType': [this.predictorData.weatherDataType],
      'heatingBaseTemperature': [this.predictorData.heatingBaseTemperature],
      'coolingBaseTemperature': [this.predictorData.coolingBaseTemperature],
      'weatherStationId': [this.predictorData.weatherStationId]
    });
    this.setShowReferencePredictors()
    this.setUnitOptions();
    this.setValidators();
  }


  setValidators() {
    if (this.predictorForm.controls.predictorType.value == 'Standard') {
      this.predictorForm.controls.heatingBaseTemperature.setValidators([]);
      this.predictorForm.controls.coolingBaseTemperature.setValidators([]);
      this.predictorForm.controls.weatherStationId.setValidators([]);
      this.predictorForm.controls.weatherDataType.setValidators([]);
    } else if (this.predictorForm.controls.predictorType.value == 'Weather') {
      this.predictorForm.controls.weatherStationId.setValidators([Validators.required]);
      this.predictorForm.controls.weatherDataType.setValidators([Validators.required]);
      if (this.predictorForm.controls.weatherDataType.value == 'HDD') {
        this.predictorForm.controls.heatingBaseTemperature.setValidators([Validators.required]);
        this.predictorForm.controls.coolingBaseTemperature.setValidators([]);
      } else if (this.predictorForm.controls.weatherDataType.value == 'CDD') {
        this.predictorForm.controls.heatingBaseTemperature.setValidators([]);
        this.predictorForm.controls.coolingBaseTemperature.setValidators([Validators.required]);
      }
    }
    this.predictorForm.controls.heatingBaseTemperature.updateValueAndValidity();
    this.predictorForm.controls.coolingBaseTemperature.updateValueAndValidity();
    this.predictorForm.controls.weatherStationId.updateValueAndValidity();
    this.predictorForm.controls.weatherDataType.updateValueAndValidity();
  }


  cancel() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('facility/' + selectedFacility.id + '/utility/predictors/manage/predictor-table')
  }

  saveChanges() {

  }

  setShowReferencePredictors() {
    this.showReferencePredictors = this.predictorForm.controls.predictorType.value == 'Conversion' || this.predictorForm.controls.predictorType.value == 'Math';
  }

  setReferencePredictors() {
    let facilityPredictors: Array<PredictorData> = this.predictorDbService.facilityPredictors.getValue();
    this.referencePredictors = facilityPredictors.filter(predictor => { return predictor.id != this.predictorData.id });
  }

  setUnitOptions() {
    if (this.predictorForm.controls.conversionType.value) {
      this.unitOptions = this.convertUnitsService.possibilities(this.predictorForm.controls.conversionType.value);
    } else {
      this.unitOptions = [];
    }
  }

  setReferencePredictorName() {
    let facilityPredictors: Array<PredictorData> = this.predictorDbService.facilityPredictors.getValue();
    let referencePredictor: PredictorData = facilityPredictors.find(predictor => { return predictor.id == this.predictorForm.controls.referencePredictorId.value });
    if (referencePredictor) {
      this.referencePredictorName = referencePredictor.name;
    }
  }

  setStations() {
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.degreeDaysService.getClosestStation(facility.zip, 50).then(stations => {
      this.stations = stations;
    });
  }

  goToWeatherData() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.weatherDataService.zipCode = selectedFacility.zip;
    this.router.navigateByUrl('/weather-data');
  }
}
