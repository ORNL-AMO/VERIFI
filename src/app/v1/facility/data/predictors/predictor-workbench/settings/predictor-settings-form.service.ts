import { Injectable, inject } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { IdbPredictor, WeatherDataType } from '@data/models/idbModels/predictor';
import { SupportedPredictorType } from '../../models';

export interface PredictorSettingsFormControls {
  name: FormControl<string>;
  unit: FormControl<string>;
  description: FormControl<string>;
  production: FormControl<boolean>;
  predictorType: FormControl<SupportedPredictorType>;
  weatherDataType: FormControl<WeatherDataType>;
  weatherStationId: FormControl<string>;
  weatherStationName: FormControl<string>;
  heatingBaseTemperature: FormControl<number | null>;
  coolingBaseTemperature: FormControl<number | null>;
  noLongerInUse: FormControl<boolean>;
  stopMonth: FormControl<string>;
  canBeNegative: FormControl<boolean>;
  ignoreDateStatusChecks: FormControl<boolean>;
}

export type PredictorSettingsForm = FormGroup<PredictorSettingsFormControls>;

@Injectable({ providedIn: 'root' })
export class PredictorSettingsFormService {
  private readonly formBuilder = inject(FormBuilder);

  build(predictor: IdbPredictor): PredictorSettingsForm {
    return this.formBuilder.group<PredictorSettingsFormControls>({
      name: this.formBuilder.nonNullable.control(predictor.name || '', [Validators.required, Validators.maxLength(100)]),
      unit: this.formBuilder.nonNullable.control(predictor.unit || '', [Validators.maxLength(100)]),
      description: this.formBuilder.nonNullable.control(predictor.description || ''),
      production: this.formBuilder.nonNullable.control(!!predictor.production),
      predictorType: this.formBuilder.nonNullable.control(asSupportedType(predictor.predictorType)),
      weatherDataType: this.formBuilder.nonNullable.control(predictor.weatherDataType || 'HDD'),
      weatherStationId: this.formBuilder.nonNullable.control(predictor.weatherStationId || ''),
      weatherStationName: this.formBuilder.nonNullable.control(predictor.weatherStationName || ''),
      heatingBaseTemperature: this.formBuilder.control<number | null>(finiteOrNull(predictor.heatingBaseTemperature)),
      coolingBaseTemperature: this.formBuilder.control<number | null>(finiteOrNull(predictor.coolingBaseTemperature)),
      noLongerInUse: this.formBuilder.nonNullable.control(!!predictor.noLongerInUse),
      stopMonth: this.formBuilder.nonNullable.control(formatStopMonth(predictor.noLongerInUseYear, predictor.noLongerInUseMonth)),
      canBeNegative: this.formBuilder.nonNullable.control(!!predictor.canBeNegative),
      ignoreDateStatusChecks: this.formBuilder.nonNullable.control(!!predictor.ignoreDateStatusChecks)
    }, { validators: weatherSettingsValidator() });
  }

  updatePredictor(predictor: IdbPredictor, form: PredictorSettingsForm): IdbPredictor {
    const value = form.getRawValue();
    const updated = structuredClone(predictor);
    updated.name = value.name.trim();
    updated.unit = clean(value.unit);
    updated.description = clean(value.description);
    updated.production = value.production;
    updated.predictorType = value.predictorType;
    updated.noLongerInUse = value.noLongerInUse;
    const stop = parseStopMonth(value.stopMonth);
    updated.noLongerInUseYear = value.noLongerInUse ? stop?.year : undefined;
    updated.noLongerInUseMonth = value.noLongerInUse ? stop?.month : undefined;
    updated.canBeNegative = value.canBeNegative;
    updated.ignoreDateStatusChecks = value.ignoreDateStatusChecks;
    if (value.predictorType === 'Weather') {
      updated.weatherDataType = value.weatherDataType;
      updated.weatherStationId = value.weatherStationId;
      updated.weatherStationName = value.weatherStationName;
      updated.heatingBaseTemperature = value.heatingBaseTemperature ?? undefined;
      updated.coolingBaseTemperature = value.coolingBaseTemperature ?? undefined;
    }
    return updated;
  }
}

function weatherSettingsValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const form = control as PredictorSettingsForm;
    if (form.controls.predictorType.value !== 'Weather') return null;
    const errors: ValidationErrors = {};
    if (!form.controls.weatherStationId.value || !form.controls.weatherStationName.value) errors['weatherStationRequired'] = true;
    if (form.controls.weatherDataType.value === 'HDD' && !Number.isFinite(form.controls.heatingBaseTemperature.value)) errors['heatingBaseRequired'] = true;
    if (form.controls.weatherDataType.value === 'CDD' && !Number.isFinite(form.controls.coolingBaseTemperature.value)) errors['coolingBaseRequired'] = true;
    return Object.keys(errors).length ? errors : null;
  };
}

function asSupportedType(value: IdbPredictor['predictorType']): SupportedPredictorType {
  return value === 'Weather' ? 'Weather' : 'Standard';
}
function clean(value: string): string | undefined { return value.trim() || undefined; }
function finiteOrNull(value: number | undefined): number | null { return Number.isFinite(value) ? value! : null; }
function formatStopMonth(year: number | undefined, zeroBasedMonth: number | undefined): string {
  if (!Number.isInteger(year) || !Number.isInteger(zeroBasedMonth) || zeroBasedMonth! < 0 || zeroBasedMonth! > 11) return '';
  return `${year}-${String(zeroBasedMonth! + 1).padStart(2, '0')}`;
}
function parseStopMonth(value: string): { year: number; month: number } | undefined {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const month = Number(match[2]);
  return month >= 1 && month <= 12 ? { year: Number(match[1]), month: month - 1 } : undefined;
}
