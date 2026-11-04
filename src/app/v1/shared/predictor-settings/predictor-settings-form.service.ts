import { Injectable, inject } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { applyStandardPredictorSettings, StandardPredictorSettings, standardPredictorSettings,
  parsePredictorStopMonth } from '@app/v1/data/predictors/models/standard-predictor-settings.models';

export interface PredictorSettingsFormControls {
  name: FormControl<string>;
  unit: FormControl<string>;
  description: FormControl<string>;
  production: FormControl<boolean>;
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
    const value = standardPredictorSettings(predictor);
    return this.formBuilder.group<PredictorSettingsFormControls>({
      name: this.formBuilder.nonNullable.control(value.name, [Validators.required, Validators.maxLength(100),
        control => control.value.trim() ? null : { required: true }]),
      unit: this.formBuilder.nonNullable.control(value.unit, [Validators.maxLength(100)]),
      description: this.formBuilder.nonNullable.control(value.description),
      production: this.formBuilder.nonNullable.control(value.production),
      noLongerInUse: this.formBuilder.nonNullable.control(value.noLongerInUse),
      stopMonth: this.formBuilder.nonNullable.control(value.stopMonth),
      canBeNegative: this.formBuilder.nonNullable.control(value.canBeNegative),
      ignoreDateStatusChecks: this.formBuilder.nonNullable.control(value.ignoreDateStatusChecks)
    }, { validators: stopMonthValidator() });
  }

  updatePredictor(predictor: IdbPredictor, form: PredictorSettingsForm): IdbPredictor {
    return applyStandardPredictorSettings(predictor, form.getRawValue());
  }

  hydrate(form: PredictorSettingsForm, value: StandardPredictorSettings): void {
    form.patchValue(value, { emitEvent: false });
    form.updateValueAndValidity({ emitEvent: false });
  }
}

function stopMonthValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const form = control as PredictorSettingsForm;
    return form.controls.noLongerInUse.value && form.controls.stopMonth.value
      && !parsePredictorStopMonth(form.controls.stopMonth.value) ? { invalidStopMonth: true } : null;
  };
}
