import { Injectable } from '@angular/core';
import { ValidatorFn, Validators } from '@angular/forms';
import { MeterSource } from '@data/models/constantsAndTypes';
import { ChargesTypes, getChargeTypes } from '@data/models/meter-charges-options';
import type { MeterChargeValues, MeterSettingsForm } from '../meter-settings-values';
import {
  checkShowHeatCapacity,
  checkShowSiteToSource
} from '@shared/sharedHelperFunctions';

@Injectable({ providedIn: 'root' })
export class MeterSettingsValidationService {
  getIncompatibleChargeTypes(source: MeterSource, charges: readonly MeterChargeValues[]): Readonly<Record<string, { readonly label: string }>> {
    const allowed = new Set(getChargeTypes(source).map(type => type.value));
    return Object.fromEntries(charges.flatMap(charge => {
      const type = charge.chargeType;
      return type && !allowed.has(type) ? [[charge.guid, {
        label: ChargesTypes.find(option => option.value === type)?.label ?? type
      }]] : [];
    }));
  }

  getChargeTypesValidation(): ValidatorFn {
    return control => {
      const form = control as MeterSettingsForm;
      const incompatible = this.getIncompatibleChargeTypes(form.controls.source.value, form.controls.chargesArray.getRawValue());
      return Object.keys(incompatible).length ? { incompatibleChargeTypes: incompatible } : null;
    };
  }

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
