import { Injectable, inject } from '@angular/core';
import { FormArray, FormGroup } from '@angular/forms';
import { MeterPhase, MeterSource } from '@data/models/constantsAndTypes';
import { IdbFacility } from '@data/models/idbModels/facility';
import { getChargeTypes } from '@data/models/meter-charges-options';
import { getFuelTypeOptions, getMobileFuelTypes } from '@shared/fuel-options/getFuelTypeOptions';
import { StationaryOtherEnergyOptions } from '@shared/fuel-options/stationaryOtherEnergyOptions';
import {
  EnergyUnitOptions,
  VolumeLiquidOptions
} from '@shared/unitOptions';
import { VehicleTypes } from '@shared/vehicle-data/vehicleType';
import {
  checkShowHeatCapacity,
  checkShowSiteToSource,
  getHeatingCapacity,
  getSiteToSource
} from '@shared/sharedHelperFunctions';
import { MeterSettingsRuleChange, MeterSettingsRuleContext } from './meter-settings-form.models';
import { MeterSettingsValidationService } from './meter-settings-validation.service';
import { MeterSettingsViewModelService } from './meter-settings-view-model.service';

@Injectable({ providedIn: 'root' })
export class MeterSettingsRulesService {
  private readonly validation = inject(MeterSettingsValidationService);
  private readonly viewModel = inject(MeterSettingsViewModelService);

  applyMeterSettingsRuleChange(kind: MeterSettingsRuleChange, form: FormGroup, context: MeterSettingsRuleContext): void {
    if (kind === 'source') {
      form.controls.energyUnit.patchValue(form.controls.source.value === 'Electricity' ? 'kWh' : context.facility.energyUnit, { emitEvent: false });
      form.controls.scope.patchValue(this.getDefaultScope(form.controls.source.value), { emitEvent: false });
      this.setFuelTypeOptions(form, context, false);
      this.setStartingUnit(form, context.facility);
      this.setUnitBooleans(form);
      this.setHeatCapacity(form, context);
      this.setSiteToSource(form, context);
      this.syncChargeTypes(form);
    } else if (kind === 'scope') {
      this.setFuelTypeOptions(form, context, true);
      this.setStartingUnitOptionsAndValue(form, context);
    } else if (kind === 'phase') {
      this.setStartingUnitOptionsAndValue(form, context);
      this.setFuelTypeOptions(form, context, false);
      this.setHeatCapacity(form, context);
      this.setSiteToSource(form, context);
    } else if (kind === 'fuel') {
      if (form.controls.source.value === 'Other Energy') {
        this.setStartingUnitOptionsAndValue(form, context);
        this.setUnitBooleans(form);
      }
      this.setHeatCapacity(form, context);
      this.setSiteToSource(form, context);
    } else if (kind === 'collectionUnit') {
      this.setUnitBooleans(form);
      this.setHeatCapacity(form, context);
      this.setSiteToSource(form, context);
    } else if (kind === 'energyUnit') {
      this.setHeatCapacity(form, context);
    } else if (kind === 'agreementType') {
      this.applyAgreementTypeDefaults(form);
      this.setSiteToSource(form, context);
    } else if (kind === 'includeInEnergy') {
      if (form.controls.includeInEnergy.value === false) {
        form.controls.siteToSource.patchValue(1, { emitEvent: false });
      } else {
        this.setSiteToSource(form, context);
      }
    } else if (kind === 'vehicleCategory') {
      this.setVehicleTypes(form, context);
    } else if (kind === 'vehicleType') {
      this.setVehicleFuelOptions(form, context);
    } else if (kind === 'vehicleCollectionUnit' || kind === 'vehicleFuel') {
      this.setVehicleHeatCapacity(form, context);
    } else if (kind === 'chargeType') {
      this.syncChargeTypes(form);
    }

    this.updateValidators(form);
  }

  getDefaultScope(source: MeterSource): number | undefined {
    if (source === 'Electricity') { return 3; }
    if (source === 'Other Energy') { return 4; }
    if (source === 'Natural Gas') { return 1; }
    if (source === 'Other Fuels') { return 1; }
    if (source === 'Other') { return 100; }
    return undefined;
  }

  private setStartingUnitOptionsAndValue(form: FormGroup, context: MeterSettingsRuleContext): void {
    const options = this.viewModel.getStartingUnitOptions(form, context.meterDataExists);
    if (!options.some(option => option.value === form.controls.startingUnit.value)) {
      this.setStartingUnit(form, context.facility);
    }
  }

  private setStartingUnit(form: FormGroup, facility: IdbFacility): void {
    const source = form.controls.source.value as MeterSource;
    let facilityUnit = form.controls.startingUnit.value as string;
    if (source === 'Electricity') {
      facilityUnit = facility.electricityUnit;
    } else if (source === 'Natural Gas') {
      facilityUnit = facility.volumeGasUnit;
    } else if (source === 'Other Fuels') {
      const phase = form.controls.phase.value as MeterPhase;
      if (phase === 'Gas') { facilityUnit = facility.volumeGasUnit; }
      if (phase === 'Liquid') { facilityUnit = facility.volumeLiquidUnit; }
      if (phase === 'Solid') { facilityUnit = facility.massUnit; }
    } else if (source === 'Other Energy') {
      const selectedEnergyOption = StationaryOtherEnergyOptions.find(option => option.value === form.controls.fuel.value);
      if (selectedEnergyOption?.otherEnergyType === 'Steam') { facilityUnit = facility.massUnit; }
      if (selectedEnergyOption?.otherEnergyType === 'Chilled Water' || selectedEnergyOption?.otherEnergyType === 'Hot Water') {
        facilityUnit = facility.energyUnit;
      }
      if (selectedEnergyOption?.otherEnergyType === 'Compressed Air') { facilityUnit = facility.volumeGasUnit; }
    } else if (source === 'Water Intake' || source === 'Water Discharge') {
      facilityUnit = facility.volumeLiquidUnit;
    } else if (source === 'Other') {
      facilityUnit = facility.massUnit;
    }
    form.controls.startingUnit.patchValue(facilityUnit, { emitEvent: false });
    form.controls.startingUnit.updateValueAndValidity({ emitEvent: false });
  }

  private setUnitBooleans(form: FormGroup): void {
    const selectedUnit = EnergyUnitOptions.find(option => option.value === form.controls.startingUnit.value);
    if (selectedUnit) {
      form.controls.energyUnit.patchValue(selectedUnit.value, { emitEvent: false });
    }
  }

  private setFuelTypeOptions(form: FormGroup, context: MeterSettingsRuleContext, preserveCurrent: boolean): void {
    const options = getFuelTypeOptions(
      form.controls.source.value,
      form.controls.phase.value,
      [...context.customFuels],
      form.controls.scope.value,
      form.controls.vehicleCategory.value,
      form.controls.vehicleType.value
    );
    const selectedEnergyOption = options.find(option => option.value === form.controls.fuel.value);
    if (!selectedEnergyOption && options.length && !preserveCurrent) {
      form.controls.fuel.patchValue(options[0].value, { emitEvent: false });
    }
  }

  private setHeatCapacity(form: FormGroup, context: MeterSettingsRuleContext): void {
    if (checkShowHeatCapacity(form.controls.source.value, form.controls.startingUnit.value, form.controls.scope.value)) {
      const options = getFuelTypeOptions(
        form.controls.source.value,
        form.controls.phase.value,
        [...context.customFuels],
        form.controls.scope.value,
        form.controls.vehicleCategory.value,
        form.controls.vehicleType.value
      );
      const selectedFuelTypeOption = options.find(option => option.value === form.controls.fuel.value);
      form.controls.heatCapacity.patchValue(getHeatingCapacity(
        form.controls.source.value,
        form.controls.startingUnit.value,
        form.controls.energyUnit.value,
        selectedFuelTypeOption
      ), { emitEvent: false });
    }
  }

  private setSiteToSource(form: FormGroup, context: MeterSettingsRuleContext): void {
    if (checkShowSiteToSource(form.controls.source.value, form.controls.includeInEnergy.value, form.controls.scope.value)) {
      const options = getFuelTypeOptions(
        form.controls.source.value,
        form.controls.phase.value,
        [...context.customFuels],
        form.controls.scope.value,
        form.controls.vehicleCategory.value,
        form.controls.vehicleType.value
      );
      const selectedFuelTypeOption = options.find(option => option.value === form.controls.fuel.value);
      form.controls.siteToSource.patchValue(getSiteToSource(
        form.controls.source.value,
        selectedFuelTypeOption,
        form.controls.agreementType.value
      ), { emitEvent: false });
    } else {
      form.controls.siteToSource.patchValue(1, { emitEvent: false });
    }
  }

  private applyAgreementTypeDefaults(form: FormGroup): void {
    const agreementType = form.controls.agreementType.value;
    form.controls.includeInEnergy.patchValue(agreementType !== 4 && agreementType !== 6, { emitEvent: false });
    form.controls.retainRECs.patchValue(agreementType !== 1, { emitEvent: false });
    form.controls.directConnection.patchValue(agreementType === 2, { emitEvent: false });
  }

  private setVehicleTypes(form: FormGroup, context: MeterSettingsRuleContext): void {
    const vehicleTypes = VehicleTypes.filter(option => option.category === form.controls.vehicleCategory.value);
    if (vehicleTypes.length) {
      if (!vehicleTypes.some(option => option.value === form.controls.vehicleType.value)) {
        form.controls.vehicleType.patchValue(vehicleTypes[0].value, { emitEvent: false });
      }
    } else {
      form.controls.vehicleType.patchValue(undefined, { emitEvent: false });
    }
    if (form.controls.vehicleCategory.value !== 2 && form.controls.vehicleCollectionType.value === 2) {
      form.controls.vehicleCollectionType.patchValue(1, { emitEvent: false });
    }
    if (!VolumeLiquidOptions.some(option => option.value === form.controls.vehicleCollectionUnit.value)) {
      form.controls.vehicleCollectionUnit.patchValue('gal', { emitEvent: false });
    }
    this.setVehicleFuelOptions(form, context);
  }

  private setVehicleFuelOptions(form: FormGroup, context: MeterSettingsRuleContext): void {
    const options = getMobileFuelTypes(form.controls.vehicleCategory.value, form.controls.vehicleType.value, [...context.customFuels]);
    if (!options.some(option => option.value === form.controls.vehicleFuel.value)) {
      form.controls.vehicleFuel.patchValue(options[0]?.value, { emitEvent: false });
    }
    this.setVehicleHeatCapacity(form, context);
  }

  private setVehicleHeatCapacity(form: FormGroup, context: MeterSettingsRuleContext): void {
    const fuelOptions = getMobileFuelTypes(form.controls.vehicleCategory.value, form.controls.vehicleType.value, [...context.customFuels]);
    const selectedFuelTypeOption = fuelOptions.find(option => option.value === form.controls.vehicleFuel.value);
    form.controls.heatCapacity.patchValue(getHeatingCapacity(
      form.controls.source.value,
      form.controls.vehicleCollectionUnit.value,
      form.controls.energyUnit.value,
      selectedFuelTypeOption
    ), { emitEvent: false });
  }

  private syncChargeTypes(form: FormGroup): void {
    const chargeTypes = getChargeTypes(form.controls.source.value);
    const chargesArray = form.get('chargesArray') as FormArray;
    chargesArray.controls.forEach(charge => {
      const chargeType = charge.get('chargeType');
      if (chargeType && !chargeTypes.some(type => type.value === chargeType.value)) {
        chargeType.setValue(null, { emitEvent: false });
        chargeType.updateValueAndValidity({ emitEvent: false });
      }
    });
  }

  private updateValidators(form: FormGroup): void {
    form.controls.fuel.setValidators(this.validation.getFuelValidation(form.controls.source.value, form.controls.scope.value));
    form.controls.phase.setValidators(this.validation.getPhaseValidation(form.controls.source.value, form.controls.scope.value));
    form.controls.heatCapacity.setValidators(this.validation.getHeatCapacityValidation(
      form.controls.source.value,
      form.controls.startingUnit.value,
      form.controls.scope.value
    ));
    form.controls.siteToSource.setValidators(this.validation.getSiteToSourceValidation(
      form.controls.source.value,
      form.controls.includeInEnergy.value,
      form.controls.scope.value
    ));
    form.controls.waterIntakeType.setValidators(this.validation.getWaterIntakeValidation(form.controls.source.value));
    form.controls.waterDischargeType.setValidators(this.validation.getWaterDischargeValidation(form.controls.source.value));
    form.controls.vehicleCategory.setValidators(this.validation.getBasicVehicleValidation(form.controls.scope.value));
    form.controls.vehicleCollectionUnit.setValidators(this.validation.getBasicVehicleValidation(form.controls.scope.value));
    form.controls.vehicleFuel.setValidators(this.validation.getBasicVehicleValidation(form.controls.scope.value));
    form.controls.vehicleType.setValidators(this.validation.getAdditionalVehicleValidation(form.controls.scope.value, form.controls.vehicleCategory.value));
    form.controls.vehicleCollectionType.setValidators(this.validation.getAdditionalVehicleValidation(form.controls.scope.value, form.controls.vehicleCategory.value));
    form.controls.vehicleFuelEfficiency.setValidators(this.validation.getAdditionalVehicleValidation(form.controls.scope.value, form.controls.vehicleCategory.value));
    form.controls.vehicleDistanceUnit.setValidators(this.validation.getAdditionalVehicleValidation(form.controls.scope.value, form.controls.vehicleCategory.value));
    form.controls.globalWarmingPotentialOption.setValidators(this.validation.getGlobalWarmingPotentialValidation(form.controls.scope.value));
    [
      'fuel',
      'phase',
      'heatCapacity',
      'siteToSource',
      'waterIntakeType',
      'waterDischargeType',
      'vehicleCategory',
      'vehicleCollectionUnit',
      'vehicleFuel',
      'vehicleType',
      'vehicleCollectionType',
      'vehicleFuelEfficiency',
      'vehicleDistanceUnit',
      'globalWarmingPotentialOption'
    ].forEach(controlName => form.controls[controlName].updateValueAndValidity({ emitEvent: false }));
  }
}
