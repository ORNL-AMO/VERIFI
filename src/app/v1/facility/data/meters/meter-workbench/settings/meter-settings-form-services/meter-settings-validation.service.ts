import { Injectable } from '@angular/core';
import { ValidatorFn, Validators } from '@angular/forms';
import { MeterSource } from '@data/models/constantsAndTypes';
import {
  checkShowHeatCapacity,
  checkShowSiteToSource
} from '@shared/sharedHelperFunctions';

@Injectable({ providedIn: 'root' })
export class MeterSettingsValidationService {
  getFuelValidation(source: MeterSource, scope: number): ValidatorFn[] {
    return (source === 'Other Fuels' && scope !== 2) || source === 'Other Energy' ? [Validators.required] : [];
  }

  getPhaseValidation(source: MeterSource, scope: number): ValidatorFn[] {
    return source === 'Other Fuels' && scope !== 2 ? [Validators.required] : [];
  }

  getHeatCapacityValidation(source: MeterSource, startingUnit: string, scope: number): ValidatorFn[] {
    return checkShowHeatCapacity(source, startingUnit, scope) ? [Validators.required, Validators.min(0)] : [];
  }

  getSiteToSourceValidation(source: MeterSource, includeInEnergy: boolean, scope: number): ValidatorFn[] {
    return checkShowSiteToSource(source, includeInEnergy, scope) ? [Validators.required, Validators.min(0)] : [];
  }

  getWaterIntakeValidation(source: MeterSource): ValidatorFn[] {
    return source === 'Water Intake' ? [Validators.required] : [];
  }

  getWaterDischargeValidation(source: MeterSource): ValidatorFn[] {
    return source === 'Water Discharge' ? [Validators.required] : [];
  }

  getBasicVehicleValidation(scope: number): ValidatorFn[] {
    return scope === 2 ? [Validators.required] : [];
  }

  getAdditionalVehicleValidation(scope: number, vehicleCategory: number): ValidatorFn[] {
    return scope === 2 && vehicleCategory === 2 ? [Validators.required] : [];
  }

  getGlobalWarmingPotentialValidation(scope: number): ValidatorFn[] {
    return scope === 5 || scope === 6 ? [Validators.required] : [];
  }
}
