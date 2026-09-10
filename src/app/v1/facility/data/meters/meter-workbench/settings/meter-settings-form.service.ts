import { Injectable, inject } from '@angular/core';
import { FormGroup, ValidatorFn } from '@angular/forms';
import { MeterSource } from '@data/models/constantsAndTypes';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { FuelTypeOption } from '@shared/fuel-options/fuelTypeOption';
import type {
  MeterSettingsRuleChange,
  MeterSettingsRuleContext,
  MeterSettingsViewModel
} from './meter-settings-form-services/meter-settings-form.models';
import { MeterSettingsDisplayService } from './meter-settings-form-services/meter-settings-display.service';
import { MeterSettingsFormBuilderService } from './meter-settings-form-services/meter-settings-form-builder.service';
import { MeterSettingsRulesService } from './meter-settings-form-services/meter-settings-rules.service';
import { MeterSettingsValidationService } from './meter-settings-form-services/meter-settings-validation.service';
import { MeterSettingsViewModelService } from './meter-settings-form-services/meter-settings-view-model.service';

export type {
  MeterSettingsRuleChange,
  MeterSettingsRuleContext,
  MeterSettingsViewModel
} from './meter-settings-form-services/meter-settings-form.models';

@Injectable({ providedIn: 'root' })
export class MeterSettingsFormService {
  private readonly builder = inject(MeterSettingsFormBuilderService);
  private readonly display = inject(MeterSettingsDisplayService);
  private readonly rules = inject(MeterSettingsRulesService);
  private readonly validation = inject(MeterSettingsValidationService);
  private readonly viewModel = inject(MeterSettingsViewModelService);

  buildMeterSettingsForm(meter: IdbUtilityMeter): FormGroup {
    return this.builder.buildMeterSettingsForm(meter);
  }

  updateMeterFromSettingsForm(meter: IdbUtilityMeter, form: FormGroup): IdbUtilityMeter {
    return this.builder.updateMeterFromSettingsForm(meter, form);
  }

  buildMeterSettingsViewModel(form: FormGroup, context: MeterSettingsRuleContext): MeterSettingsViewModel {
    return this.viewModel.buildMeterSettingsViewModel(form, context);
  }

  applyMeterSettingsRuleChange(kind: MeterSettingsRuleChange, form: FormGroup, context: MeterSettingsRuleContext): void {
    this.rules.applyMeterSettingsRuleChange(kind, form, context);
  }

  addCharge(form: FormGroup): void {
    this.builder.addCharge(form);
  }

  removeCharge(form: FormGroup, index: number): void {
    this.builder.removeCharge(form, index);
  }

  getFuelValidation(source: MeterSource, scope: number): ValidatorFn[] {
    return this.validation.getFuelValidation(source, scope);
  }

  getPhaseValidation(source: MeterSource, scope: number): ValidatorFn[] {
    return this.validation.getPhaseValidation(source, scope);
  }

  getHeatCapacityValidation(source: MeterSource, startingUnit: string, scope: number): ValidatorFn[] {
    return this.validation.getHeatCapacityValidation(source, startingUnit, scope);
  }

  getSiteToSourceValidation(source: MeterSource, includeInEnergy: boolean, scope: number): ValidatorFn[] {
    return this.validation.getSiteToSourceValidation(source, includeInEnergy, scope);
  }

  getWaterIntakeValidation(source: MeterSource): ValidatorFn[] {
    return this.validation.getWaterIntakeValidation(source);
  }

  getWaterDischargeValidation(source: MeterSource): ValidatorFn[] {
    return this.validation.getWaterDischargeValidation(source);
  }

  getBasicVehicleValidation(scope: number): ValidatorFn[] {
    return this.validation.getBasicVehicleValidation(scope);
  }

  getAdditionalVehicleValidation(scope: number, vehicleCategory: number): ValidatorFn[] {
    return this.validation.getAdditionalVehicleValidation(scope, vehicleCategory);
  }

  getGlobalWarmingPotentialValidation(scope: number): ValidatorFn[] {
    return this.validation.getGlobalWarmingPotentialValidation(scope);
  }

  getDefaultScope(source: MeterSource): number | undefined {
    return this.rules.getDefaultScope(source);
  }

  getUnitLabel(value: string): string {
    return this.display.getUnitLabel(value);
  }

  getEmissionDisplay(
    selectedFuelType: FuelTypeOption,
    energyUnits: string,
    valueType: 'CO2' | 'CH4' | 'N2O',
    collectionUnit?: string,
    distanceUnit?: string
  ): string {
    return this.display.getEmissionDisplay(selectedFuelType, energyUnits, valueType, collectionUnit, distanceUnit);
  }
}
