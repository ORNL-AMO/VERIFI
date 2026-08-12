import { Injectable } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { IdbPredictor, WeatherDataType } from 'src/app/models/idbModels/predictor';

@Injectable({
  providedIn: 'root'
})
export class EditPredictorFormService {

  constructor(private formBuilder: FormBuilder) { }

  getFormFromPredictor(predictor: IdbPredictor): FormGroup {
    const isWeather = predictor.predictorType == 'Weather';
    const weatherSelections = this.formBuilder.group({
      cdd: [isWeather && predictor.weatherDataType == 'CDD'],
      hdd: [isWeather && predictor.weatherDataType == 'HDD'],
      relativeHumidity: [isWeather && predictor.weatherDataType == 'relativeHumidity'],
      dryBulbTemp: [isWeather && predictor.weatherDataType == 'dryBulbTemp'],
      wetBulbTemp: [isWeather && predictor.weatherDataType == 'wetBulbTemp'],
      dewPointTemp: [isWeather && predictor.weatherDataType == 'dewPointTemp'],
      precipitation: [isWeather && predictor.weatherDataType == 'precipitation']
    });
    let predictorForm: FormGroup = this.formBuilder.group({
      'name': [predictor.name, [Validators.required]],
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
      'weatherSelections': weatherSelections,
      'createPredictorData': [true],
      //status settings
      'noLongerInUse': [predictor.noLongerInUse || false],
      'noLongerInUseMonth': [predictor.noLongerInUseMonth],
      'noLongerInUseYear': [predictor.noLongerInUseYear],
      'canBeNegative': [predictor.canBeNegative || false],
      'ignoreDateStatusChecks': [predictor.ignoreDateStatusChecks || false],
    });
    // this.setShowReferencePredictors()
    // this.setUnitOptions();
    this.setValidators(predictorForm);
    return predictorForm;
  }

  isAnyWeatherOptionSelected(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const values = control.value || {};
      return Object.values(values).some(Boolean) ? null : { noWeatherOptionSelected: true };
    }
  }

  setValidators(predictorForm: FormGroup) {
    const isWeather = predictorForm.controls.predictorType.value == 'Weather';
    const weatherSelections = predictorForm.get('weatherSelections');

    if (!isWeather) {
      weatherSelections?.setValidators([]);
      predictorForm.controls.heatingBaseTemperature.setValidators([]);
      predictorForm.controls.coolingBaseTemperature.setValidators([]);
      predictorForm.controls.weatherStationId.setValidators([]);
      predictorForm.controls.weatherDataType.setValidators([]);
    }
    else {
      predictorForm.controls.weatherStationId.setValidators([Validators.required]);
      weatherSelections?.setValidators([this.isAnyWeatherOptionSelected()]);

      const selectedTypes = this.getSelectedWeatherTypes(predictorForm);
      if (selectedTypes.length > 0) {
        predictorForm.controls.weatherDataType.patchValue(selectedTypes[0], { emitEvent: false });
      }

      predictorForm.controls.heatingBaseTemperature.setValidators(selectedTypes.includes('HDD') ? [Validators.required] : []);
      predictorForm.controls.coolingBaseTemperature.setValidators(selectedTypes.includes('CDD') ? [Validators.required] : []);
    }

    predictorForm.controls.heatingBaseTemperature.updateValueAndValidity({ emitEvent: false });
    predictorForm.controls.coolingBaseTemperature.updateValueAndValidity({ emitEvent: false });
    predictorForm.controls.weatherStationId.updateValueAndValidity({ emitEvent: false });
    predictorForm.controls.weatherDataType.updateValueAndValidity({ emitEvent: false });
    weatherSelections?.updateValueAndValidity({ emitEvent: false });
  }

  setPredictorDataFromForm(predictor: IdbPredictor, predictorForm: FormGroup): boolean {
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

    const selectedWeatherTypes = this.getSelectedWeatherTypes(predictorForm);
    let weatherDataChange: boolean = false;
    let nextWeatherType = predictorForm.controls.weatherDataType.value;
    if (selectedWeatherTypes.length > 0) {
      nextWeatherType = selectedWeatherTypes[0];
      predictorForm.controls.weatherDataType.patchValue(nextWeatherType, { emitEvent: false });
    }
    if (predictor.weatherDataType != nextWeatherType) {
      weatherDataChange = true;
      predictor.weatherDataType = nextWeatherType;
    }

    let name = predictorForm.controls.name.value;
    if (predictorForm.controls.predictorType.value == 'Weather' && selectedWeatherTypes.length === 1) {
      name = this.getWeatherNameForType(nextWeatherType, predictorForm);
      predictorForm.controls.name.patchValue(name, { emitEvent: false });
    }
    predictor.name = name;
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
    //status settings
    predictor.noLongerInUse = predictorForm.controls.noLongerInUse.value;
    predictor.noLongerInUseMonth = predictorForm.controls.noLongerInUseMonth.value;
    predictor.noLongerInUseYear = predictorForm.controls.noLongerInUseYear.value;
    predictor.canBeNegative = predictorForm.controls.canBeNegative.value;
    predictor.ignoreDateStatusChecks = predictorForm.controls.ignoreDateStatusChecks.value;
    return weatherDataChange;
  }

  getSelectedWeatherTypes(predictorForm: FormGroup): Array<WeatherDataType> {
    const selections = predictorForm.get('weatherSelections')?.value || {};
    const selected: Array<IdbPredictor['weatherDataType']> = [];
    if (selections.cdd) selected.push('CDD');
    if (selections.hdd) selected.push('HDD');
    if (selections.relativeHumidity) selected.push('relativeHumidity');
    if (selections.dryBulbTemp) selected.push('dryBulbTemp');
    if (selections.wetBulbTemp) selected.push('wetBulbTemp');
    if (selections.dewPointTemp) selected.push('dewPointTemp');
    if (selections.precipitation) selected.push('precipitation');
    return selected;
  }

  getWeatherNameForType(type: WeatherDataType, predictorForm: FormGroup): string {
    if (type === 'CDD') return `CDD Generated (${predictorForm.controls.coolingBaseTemperature.value} \u00B0F)`;
    if (type === 'HDD') return `HDD Generated (${predictorForm.controls.heatingBaseTemperature.value} \u00B0F)`;
    if (type === 'relativeHumidity') return 'Relative Humidity';
    if (type === 'dryBulbTemp') return 'Dry Bulb Temp';
    if (type === 'wetBulbTemp') return 'Wet Bulb Temp';
    if (type === 'dewPointTemp') return 'Dew Point Temp';
    return 'Precipitation';
  }
}
