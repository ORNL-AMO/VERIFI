import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';

@Injectable({
  providedIn: 'root'
})
export class EditPredictorFormService {

  constructor(private formBuilder: FormBuilder) { }

  getFormFromPredictor(predictor: IdbPredictor): FormGroup {
    let predictorForm: FormGroup = this.formBuilder.group({
      'name': [predictor.name, [Validators.required ]],
      'unit': [predictor.unit],
      'description': [predictor.description],
      'production': [predictor.production || false],
      'predictorType': [predictor.predictorType],
      'referencePredictorId': [predictor.referencePredictorId],
      'convertFrom': [predictor.convertFrom],
      'convertTo': [predictor.convertTo],
      'conversionType': [predictor.conversionType],
      'mathAction': [],
      'mathAmount': [],
      'weatherDataType': [predictor.weatherDataType],
      'heatingBaseTemperature': [predictor.heatingBaseTemperature],
      'coolingBaseTemperature': [predictor.coolingBaseTemperature],
      'weatherStationId': [predictor.weatherStationId],
      'createPredictorData': [true]
    });
    // this.setShowReferencePredictors()
    // this.setUnitOptions();
    this.setValidators(predictorForm);
    return predictorForm;
  }

  setValidators(predictorForm: FormGroup) {
    if (predictorForm.controls.predictorType.value == 'Standard') {
      predictorForm.controls.heatingBaseTemperature.setValidators([]);
      predictorForm.controls.coolingBaseTemperature.setValidators([]);
      predictorForm.controls.weatherStationId.setValidators([]);
      predictorForm.controls.weatherDataType.setValidators([]);
    } else if (predictorForm.controls.predictorType.value == 'Weather') {
      predictorForm.controls.weatherStationId.setValidators([Validators.required]);
      predictorForm.controls.weatherDataType.setValidators([Validators.required]);
      if (predictorForm.controls.weatherDataType.value == 'HDD') {
        predictorForm.controls.heatingBaseTemperature.setValidators([Validators.required]);
        predictorForm.controls.coolingBaseTemperature.setValidators([]);
      } else if (predictorForm.controls.weatherDataType.value == 'CDD') {
        predictorForm.controls.heatingBaseTemperature.setValidators([]);
        predictorForm.controls.coolingBaseTemperature.setValidators([Validators.required]);
      } else {
        predictorForm.controls.heatingBaseTemperature.setValidators([]);
        predictorForm.controls.coolingBaseTemperature.setValidators([]);
      }
    }
    predictorForm.controls.heatingBaseTemperature.updateValueAndValidity();
    predictorForm.controls.coolingBaseTemperature.updateValueAndValidity();
    predictorForm.controls.weatherStationId.updateValueAndValidity();
    predictorForm.controls.weatherDataType.updateValueAndValidity();
  }

  setPredictorDataFromForm(predictor: IdbPredictor, predictorForm: FormGroup): boolean {
    predictor.name = predictorForm.controls.name.value;
    predictor.unit = predictorForm.controls.unit.value;
    predictor.description = predictorForm.controls.description.value;
    predictor.production = predictorForm.controls.production.value;
    predictor.predictorType = predictorForm.controls.predictorType.value;
    predictor.referencePredictorId = predictorForm.controls.referencePredictorId.value;
    predictor.convertFrom = predictorForm.controls.convertFrom.value;
    predictor.convertTo = predictorForm.controls.convertTo.value;
    predictor.conversionType = predictorForm.controls.conversionType.value;
    // this.predictorData.mathAction = this.predictorForm.controls.name.value;
    // this.predictorData.mathAmount = this.predictorForm.controls.name.value;

    let weatherDataChange: boolean = false;
    if (predictor.weatherDataType != predictorForm.controls.weatherDataType.value) {
      weatherDataChange = true;
      predictor.weatherDataType = predictorForm.controls.weatherDataType.value;
    }
    if (predictor.heatingBaseTemperature != predictorForm.controls.heatingBaseTemperature.value) {
      weatherDataChange = true;
      predictor.heatingBaseTemperature = predictorForm.controls.heatingBaseTemperature.value;
    }
    if (predictor.coolingBaseTemperature != predictorForm.controls.coolingBaseTemperature.value) {
      weatherDataChange = true;
      predictor.coolingBaseTemperature = predictorForm.controls.coolingBaseTemperature.value;
    }
    if (predictor.weatherStationId != predictorForm.controls.weatherStationId.value) {
      weatherDataChange = true;
      predictor.weatherStationId = predictorForm.controls.weatherStationId.value;
    }
    // if (this.predictor.predictorType == 'Weather') {
    //   this.predictor.weatherStationName = this.stations.find(station => {
    //     return station.ID == this.predictor.weatherStationId;
    //   })?.name;
    // }
    return weatherDataChange;
  }
}
