import { Injectable } from '@angular/core';
import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { MeterSource } from '@data/models/constantsAndTypes';
import { EquipmentType } from '@data/models/idbModels/facilityEnergyUseEquipment';
import { SettingsHydrationMode } from '@app/v1/data/editing/settings-edit-session';
import { EnergyUseSettingsValues, EnergyUseSourceValues, EnergyUseUtilitySelection, EnergyUseMeterGroupSelection, defaultEnergyUseSource, energyUseSettingsError } from '../models/energy-use-settings.models';
import { ENERGY_USE_SOURCES } from '@data/models/energy-use-options';
import { draftEqual } from '@app/v1/data/editing/draft-reconciliation';

export type EnergyUseSourceForm = FormGroup<{
  energySource: FormControl<MeterSource>; size: FormControl<number | null>; numberOfEquipment: FormControl<number | null>; units: FormControl<string>;
}>;
export type EnergyUseSettingsForm = FormGroup<{
  name: FormControl<string>; notes: FormControl<string>; equipmentType: FormControl<EquipmentType>;
  sources: FormArray<EnergyUseSourceForm>; utilityMeterGroupIds: FormControl<string[]>;
}>;

@Injectable({ providedIn: 'root' })
export class EnergyUseSettingsFormService {
  build(value: EnergyUseSettingsValues): EnergyUseSettingsForm {
    const form = new FormGroup({
      name: new FormControl(value.name, { nonNullable: true, validators: [Validators.required, control => control.value.trim() ? null : { required: true }] }),
      notes: new FormControl(value.notes, { nonNullable: true }), equipmentType: new FormControl(value.equipmentType, { nonNullable: true }),
      sources: new FormArray(value.sources.map(row => this.source(row))),
      utilityMeterGroupIds: new FormControl([...value.utilityMeterGroupIds], { nonNullable: true })
    });
    this.validate(form, value);
    return form;
  }
  source(value: EnergyUseSourceValues): EnergyUseSourceForm {
    // Delta validation on the owning form preserves untouched imported setup values.
    return new FormGroup({ energySource: new FormControl(value.energySource, { nonNullable: true }),
      size: new FormControl<number | null>(value.size), numberOfEquipment: new FormControl<number | null>(value.numberOfEquipment),
      units: new FormControl(value.units, { nonNullable: true }) });
  }
  applyUtilities(form: EnergyUseSettingsForm, selection: EnergyUseUtilitySelection, emitEvent = true): boolean {
    const current = form.controls.sources.getRawValue();
    const selected = new Set(selection.selected);
    const additions = selection.selected.filter(source => !current.some(row => row.energySource === source));
    if (!draftEqual(current, selection.baseline) || new Set(current.map(row => row.energySource)).size !== current.length
      || selected.size !== selection.selected.length || additions.some(source => !ENERGY_USE_SOURCES.includes(source))
      || (additions.length && selected.size > 2)) return false;
    if (!additions.length && current.every(row => selected.has(row.energySource))) return true;
    const array = form.controls.sources;
    const next = [...array.controls.filter(control => selected.has(control.controls.energySource.value)),
      ...additions.map(source => this.source(defaultEnergyUseSource(source)))];
    // Publish only the complete selection, so autosave never observes a partial replacement.
    array.clear({ emitEvent: false });
    next.forEach(control => array.push(control, { emitEvent: false }));
    array.markAsDirty();
    array.updateValueAndValidity({ emitEvent });
    return true;
  }
  applyMeterGroups(form: EnergyUseSettingsForm, selection: EnergyUseMeterGroupSelection): boolean {
    if (!draftEqual(form.controls.utilityMeterGroupIds.value, selection.baseline)
      || new Set(selection.selected).size !== selection.selected.length) return false;
    const unchangedLinks = draftEqual([...selection.selected].sort(), [...selection.baseline].sort());
    const unchangedUtilities = draftEqual(form.controls.sources.getRawValue().map(source => source.energySource).sort(), [...selection.utilities.selected].sort());
    if (unchangedLinks && (!selection.selected.length || unchangedUtilities)) return true;
    if (!this.applyUtilities(form, selection.utilities, false)) return false;
    form.controls.utilityMeterGroupIds.setValue([...selection.selected], { emitEvent: false });
    form.markAsDirty();
    form.updateValueAndValidity();
    return true;
  }
  validate(form: EnergyUseSettingsForm, baseline?: EnergyUseSettingsValues): void {
    form.setValidators(() => {
      const message = energyUseSettingsError(form.getRawValue(), baseline);
      return message ? { energyUseSettings: message } : null;
    });
    form.updateValueAndValidity({ emitEvent: false });
  }
  hydrate(form: EnergyUseSettingsForm, value: EnergyUseSettingsValues, mode: SettingsHydrationMode): void {
    for (const field of ['name', 'notes'] as const) {
      const control = form.controls[field];
      const equivalent = field === 'name' ? control.value.trim() === value[field] : control.value === value[field];
      if (mode === 'reset' || !equivalent) control.setValue(value[field], { emitEvent: false });
    }
    form.controls.equipmentType.setValue(value.equipmentType, { emitEvent: false });
    form.controls.utilityMeterGroupIds.setValue([...value.utilityMeterGroupIds], { emitEvent: false });
    const available = [...form.controls.sources.controls];
    const next = value.sources.map(row => {
      const index = available.findIndex(control => control.controls.energySource.value === row.energySource);
      const control = index < 0 ? this.source(row) : available.splice(index, 1)[0];
      if (mode === 'reset' || JSON.stringify(control.getRawValue()) !== JSON.stringify(row)) control.patchValue(row, { emitEvent: false });
      return control;
    });
    const array = form.controls.sources;
    if (array.length !== next.length || next.some((control, index) => array.at(index) !== control)) {
      array.clear({ emitEvent: false }); next.forEach(control => array.push(control, { emitEvent: false }));
    }
    form.updateValueAndValidity({ emitEvent: false });
  }
}
