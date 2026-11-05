import { Injectable, inject } from '@angular/core';
import { FormArray, FormControl, FormGroup, ValidatorFn } from '@angular/forms';
import { IdbFacility } from '@data/models/idbModels/facility';
import { SettingsHydrationMode } from '@app/v1/data/editing/settings-edit-session';
import { draftEqual } from '@app/v1/data/editing/draft-reconciliation';
import { AnnualConditionsValues, AnnualConsumptionValues, AnnualSourceValues, EnergyUseSetupValues, energyUseSetupError, normalizeEnergyUseSetup } from '../models/energy-use-setup.models';
import { EnergyUseSettingsForm, EnergyUseSettingsFormService } from './energy-use-settings-form.service';

type Controls<T> = { -readonly [K in keyof T]-?: FormControl<T[K]> };
export type AnnualConditionsForm = FormGroup<Controls<AnnualConditionsValues>>;
export type AnnualConsumptionForm = FormGroup<Controls<AnnualConsumptionValues>>;
export type AnnualSourceForm = FormGroup<{ energySource: FormControl<AnnualSourceValues['energySource']>; entries: FormArray<AnnualConsumptionForm> }>;
export type EnergyUseSetupForm = FormGroup<{ settings: EnergyUseSettingsForm;
  conditions: FormArray<AnnualConditionsForm>; consumption: FormArray<AnnualSourceForm>;
}>;

@Injectable({ providedIn: 'root' })
export class EnergyUseSetupFormService {
  readonly settings = inject(EnergyUseSettingsFormService);
  build(value: EnergyUseSetupValues): EnergyUseSetupForm {
    const settings = this.settings.build(value);
    return new FormGroup({ settings, conditions: new FormArray(value.conditions.map(row => this.conditions(row))),
      consumption: new FormArray(value.consumption.map(row => this.source(row))) });
  }
  conditions(row: AnnualConditionsValues): AnnualConditionsForm {
    return new FormGroup({ year: new FormControl(row.year, { nonNullable: true }), hoursOfOperation: new FormControl(row.hoursOfOperation),
      loadFactor: new FormControl(row.loadFactor), dutyFactor: new FormControl(row.dutyFactor), efficiency: new FormControl(row.efficiency),
      hoursPerDay: new FormControl(row.hoursPerDay), daysPerWeek: new FormControl(row.daysPerWeek), weeksPerYear: new FormControl(row.weeksPerYear) });
  }
  consumption(row: AnnualConsumptionValues): AnnualConsumptionForm {
    return new FormGroup({ year: new FormControl(row.year, { nonNullable: true }), energyUse: new FormControl(row.energyUse),
      overrideEnergyUse: new FormControl(row.overrideEnergyUse, { nonNullable: true }), energyUseUnit: new FormControl(row.energyUseUnit, { nonNullable: true }),
      copy: new FormControl(row.copy, { nonNullable: true }) });
  }
  source(row: AnnualSourceValues): AnnualSourceForm {
    return new FormGroup({ energySource: new FormControl(row.energySource, { nonNullable: true }), entries: new FormArray(row.entries.map(entry => this.consumption(entry))) });
  }
  hydrate(form: EnergyUseSetupForm, value: EnergyUseSetupValues, mode: SettingsHydrationMode): void {
    this.settings.hydrate(form.controls.settings, value, mode);
    this.sync(form.controls.conditions, value.conditions, row => row.year, row => this.conditions(row), (control, row) => control.patchValue({
      ...row, hoursPerDay: row.hoursPerDay ?? null, daysPerWeek: row.daysPerWeek ?? null, weeksPerYear: row.weeksPerYear ?? null
    }, { emitEvent: false }));
    this.sync(form.controls.consumption, value.consumption, row => row.energySource, row => this.source(row), (control, row) => {
      this.sync(control.controls.entries, row.entries, entry => entry.year, entry => this.consumption(entry), (entry, saved) => entry.patchValue({ ...saved, copy: saved.copy }, { emitEvent: false }));
    });
    form.updateValueAndValidity({ emitEvent: false });
  }
  synchronizeSources(form: EnergyUseSetupForm, facility: IdbFacility): void {
    const sources = form.controls.settings.controls.sources.getRawValue(), current = form.controls.consumption.getRawValue();
    if (sources.length === current.length && sources.every(source => current.some(row => row.energySource === source.energySource))) return;
    const next = sources.map(source => current.find(row => row.energySource === source.energySource) ?? { energySource: source.energySource,
      entries: form.controls.conditions.getRawValue().map(row => ({ year: row.year, energyUse: null, overrideEnergyUse: false, energyUseUnit: facility.energyUnit })) });
    this.sync(form.controls.consumption, next, row => row.energySource, row => this.source(row), () => {});
  }
  read(form: EnergyUseSetupForm): EnergyUseSetupValues {
    const value = form.getRawValue();
    return { ...value.settings, conditions: value.conditions, consumption: value.consumption };
  }
  validate(form: EnergyUseSetupForm, base: EnergyUseSetupValues, additional?: ValidatorFn): void {
    this.settings.validate(form.controls.settings, base);
    const setup: ValidatorFn = () => {
      const error = energyUseSetupError(normalizeEnergyUseSetup(this.read(form)), base);
      return error ? { energyUseSetup: error } : null;
    };
    form.setValidators(additional ? [setup, additional] : setup);
    form.updateValueAndValidity({ emitEvent: false });
  }
  private sync<T, C extends import('@angular/forms').AbstractControl>(array: FormArray<C>, rows: readonly T[], key: (row: T) => number | string,
    create: (row: T) => C, patch: (control: C, row: T) => void): void {
    const available: C[] = [...(array.controls as C[])];
    const next = rows.map(row => {
      const index = available.findIndex(control => key(control.getRawValue() as T) === key(row));
      const control = index < 0 ? create(row) : available.splice(index, 1)[0];
      if (!draftEqual(control.getRawValue(), row)) patch(control, row);
      return control;
    });
    if (array.length !== next.length || next.some((control, index) => array.at(index) !== control)) {
      array.clear({ emitEvent: false }); next.forEach(control => array.push(control, { emitEvent: false }));
    }
  }
}
