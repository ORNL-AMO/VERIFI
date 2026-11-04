import { Injectable, inject } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { applyStandardPredictorSettings, StandardPredictorSettings, standardPredictorSettings,
  normalizeStandardPredictorSettings, parsePredictorStopMonth } from '@app/v1/data/predictors/models/standard-predictor-settings.models';
import { SettingsHydrationMode } from '@app/v1/data/editing/settings-edit-session';

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

  hydrate(form: PredictorSettingsForm, value: StandardPredictorSettings, mode: SettingsHydrationMode = 'reset'): void {
    const current = form.getRawValue();
    const normalizedCurrent = normalizeStandardPredictorSettings(current);
    const normalizedIncoming = normalizeStandardPredictorSettings(value);
    const textPatch: { name?: string; unit?: string; description?: string } = {};
    for (const field of ['name', 'unit', 'description'] as const) {
      const incoming = mode === 'reconcile' && normalizedCurrent[field] === normalizedIncoming[field]
        ? current[field] : value[field];
      if (incoming !== current[field]) textPatch[field] = incoming;
    }
    form.patchValue({ ...textPatch, production: value.production, noLongerInUse: value.noLongerInUse,
      stopMonth: value.stopMonth, canBeNegative: value.canBeNegative,
      ignoreDateStatusChecks: value.ignoreDateStatusChecks }, { emitEvent: false });
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
