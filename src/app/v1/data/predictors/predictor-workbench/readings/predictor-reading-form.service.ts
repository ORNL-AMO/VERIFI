import { Injectable, inject } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { PredictorReadingEditorMode, predictorMonthKey, validPredictorReadingDate } from '../../models';

export type PredictorReadingForm = FormGroup<{
  month: FormControl<string>;
  amount: FormControl<number | null>;
  notes: FormControl<string>;
}>;

export type PredictorReadingValues = ReturnType<PredictorReadingForm['getRawValue']>;

@Injectable({ providedIn: 'root' })
export class PredictorReadingFormService {
  private readonly formBuilder = inject(FormBuilder);

  build(
    predictor: IdbPredictor,
    reading: IdbPredictorData,
    existingReadings: readonly IdbPredictorData[],
    mode: PredictorReadingEditorMode
  ): PredictorReadingForm {
    const value = this.values(reading);
    return this.formBuilder.group({
      month: this.formBuilder.nonNullable.control(
        value.month,
        [Validators.required, validMonthValidator(), uniqueMonthValidator(existingReadings, reading.guid)]
      ),
      amount: this.formBuilder.control<number | null>(
        value.amount,
        [Validators.required, finiteNumberValidator(), allowedNegativeValidator(predictor.canBeNegative)]
      ),
      notes: this.formBuilder.nonNullable.control(value.notes)
    });
  }

  values(reading: IdbPredictorData): PredictorReadingValues {
    return { month: validPredictorReadingDate(reading) ? predictorMonthKey(reading.year, reading.month) : '',
      amount: Number.isFinite(reading.amount) ? reading.amount : null, notes: reading.notes ?? '' };
  }

  refreshValidation(form: PredictorReadingForm, predictor: IdbPredictor, readingGuid: string,
    existingReadings: readonly IdbPredictorData[]): void {
    form.controls.month.setValidators([Validators.required, validMonthValidator(), uniqueMonthValidator(existingReadings, readingGuid)]);
    form.controls.amount.setValidators([Validators.required, finiteNumberValidator(), allowedNegativeValidator(predictor.canBeNegative)]);
    form.controls.month.updateValueAndValidity({ emitEvent: false });
    form.controls.amount.updateValueAndValidity({ emitEvent: false });
  }

  hydrate(form: PredictorReadingForm, value: PredictorReadingValues): void {
    form.patchValue(value, { emitEvent: false });
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
