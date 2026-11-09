import { FormGroup } from '@angular/forms';
import { WeatherDataType } from '@data/models/idbModels/predictor';

export function applyPredictorFormMode(
  predictorForm: FormGroup,
  mode: 'add' | 'edit' | undefined,
  selectedWeatherType?: WeatherDataType
) {
  const predictorType = predictorForm.controls.predictorType;
  const weatherDataType = predictorForm.controls.weatherDataType;

  if (mode !== 'edit') {
    predictorType.enable({ emitEvent: false });
    weatherDataType.enable({ emitEvent: false });
    return;
  }

  predictorType.disable({ emitEvent: false });
  if (predictorType.value === 'Weather') {
    if (selectedWeatherType) {
      weatherDataType.patchValue(selectedWeatherType, { emitEvent: false });
    }
    weatherDataType.disable({ emitEvent: false });
  } else {
    weatherDataType.enable({ emitEvent: false });
  }
}
