import { Injectable, inject } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { PredictorReadingEditorMode, predictorMonthKey, validPredictorReadingDate } from '../../models';

export type PredictorReadingForm = FormGroup<{
  month: FormControl<string>;
  amount: FormControl<number | null>;
  notes: FormControl<string>;
  manualOverride: FormControl<boolean>;
}>;

@Injectable({ providedIn: 'root' })
export class PredictorReadingFormService {
  private readonly formBuilder = inject(FormBuilder);

  build(
    predictor: IdbPredictor,
    reading: IdbPredictorData,
    existingReadings: readonly IdbPredictorData[],
    mode: PredictorReadingEditorMode
  ): PredictorReadingForm {
    const calculatedWeatherReading = predictor.predictorType === 'Weather'
      && mode === 'edit'
      && !reading.weatherOverride;
    return this.formBuilder.group({
      month: this.formBuilder.nonNullable.control(
        { value: validPredictorReadingDate(reading) ? predictorMonthKey(reading.year, reading.month) : '', disabled: calculatedWeatherReading },
        [Validators.required, validMonthValidator(), uniqueMonthValidator(existingReadings, reading.guid)]
      ),
      amount: this.formBuilder.control<number | null>(
        { value: Number.isFinite(reading.amount) ? reading.amount : null, disabled: calculatedWeatherReading },
        [Validators.required, finiteNumberValidator(), allowedNegativeValidator(predictor.canBeNegative)]
      ),
      notes: this.formBuilder.nonNullable.control(reading.notes ?? ''),
      manualOverride: this.formBuilder.nonNullable.control(!!reading.weatherOverride)
    });
  }

  setManualOverride(form: PredictorReadingForm): void {
    form.controls.manualOverride.setValue(true);
    form.controls.month.enable();
    form.controls.amount.enable();
    form.markAsDirty();
  }

  updateReading(reading: IdbPredictorData, predictor: IdbPredictor, form: PredictorReadingForm): IdbPredictorData {
    const value = form.getRawValue();
    const [year, month] = value.month.split('-').map(Number);
    const updated = {
      ...structuredClone(reading),
      year,
      month,
      amount: Number(value.amount),
      notes: value.notes
    };
    if (predictor.predictorType === 'Weather' && value.manualOverride) {
      updated.weatherOverride = true;
      updated.weatherDataWarning = false;
      updated.weatherDataChanged = false;
    }
    return updated;
  }
}

function validMonthValidator(): ValidatorFn {
  return (control: AbstractControl<string>): ValidationErrors | null => {
    if (!control.value) return null;
    const match = /^(\d+)-(\d{2})$/.exec(control.value);
    if (!match) return { invalidMonth: true };
    const year = Number(match[1]);
    const month = Number(match[2]);
    return Number.isInteger(year) && year > 0 && month >= 1 && month <= 12
      ? null
      : { invalidMonth: true };
  };
}

function uniqueMonthValidator(readings: readonly IdbPredictorData[], currentGuid: string): ValidatorFn {
  const existingKeys = new Set(readings
    .filter(reading => reading.guid !== currentGuid && validPredictorReadingDate(reading))
    .map(reading => predictorMonthKey(reading.year, reading.month)));
  return (control: AbstractControl<string>): ValidationErrors | null => {
    return control.value && existingKeys.has(control.value) ? { duplicateMonth: true } : null;
  };
}

function finiteNumberValidator(): ValidatorFn {
  return (control: AbstractControl<number | null>): ValidationErrors | null => {
    return control.value === null || control.value === undefined || Number.isFinite(Number(control.value))
      ? null
      : { finiteNumber: true };
  };
}

function allowedNegativeValidator(canBeNegative: boolean | undefined): ValidatorFn {
  return (control: AbstractControl<number | null>): ValidationErrors | null => {
    return !canBeNegative && control.value !== null && Number(control.value) < 0
      ? { negativeNotAllowed: true }
      : null;
  };
}
