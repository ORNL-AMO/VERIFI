import { Injectable, inject } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { AllSources, MeterPhase, MeterSource, WaterDischargeTypes, WaterIntakeTypes } from '@data/models/constantsAndTypes';
import { GlobalWarmingPotentials } from '@data/models/globalWarmingPotentials';
import { getChargeTypes } from '@data/models/meter-charges-options';
import { ScopeOption, ScopeOptions } from '@data/models/scopeOption';
import { AgreementTypes } from '@data/models/agreementType';
import { getGlobalWarmingPotential } from '@domain/calculations/emissions-calculations/emissions';
import { getFuelTypeOptions, getMobileFuelTypes } from '@shared/fuel-options/getFuelTypeOptions';
import { StationaryOtherEnergyOptions } from '@shared/fuel-options/stationaryOtherEnergyOptions';
import { EnergyUnitsHelperService } from '@shared/helper-services/energy-units-helper.service';
import { Months } from '@shared/form-data/months';
import {
  DemandUnitOptions,
  EnergyUnitOptions,
  UnitOption,
  VolumeLiquidOptions
} from '@shared/unitOptions';
import {
  VehicleCategories,
  VehicleCollectionTypes
} from '@shared/vehicle-data/vehicleCategory';
import { VehicleTypes } from '@shared/vehicle-data/vehicleType';
import {
  checkShowHeatCapacity,
  checkShowSiteToSource,
  getIsEnergyMeter,
  getStartingUnitOptions
} from '@shared/sharedHelperFunctions';
import { MeterSettingsRuleContext, MeterSettingsViewModel } from './meter-settings-form.models';

@Injectable({ providedIn: 'root' })
export class MeterSettingsViewModelService {
  private readonly energyUnitsHelperService = inject(EnergyUnitsHelperService);

  buildMeterSettingsViewModel(form: FormGroup, context: MeterSettingsRuleContext): MeterSettingsViewModel {
    const source = form.controls.source.value as MeterSource;
    const scope = form.controls.scope.value as number;
    const phase = form.controls.phase.value as MeterPhase;
    const fuel = form.controls.fuel.value as string;
    const vehicleCategory = form.controls.vehicleCategory.value as number;
    const vehicleType = form.controls.vehicleType.value as number;
    const startingUnit = form.controls.startingUnit.value as string;
    const energyUnit = form.controls.energyUnit.value as string;
    const includeInEnergy = form.controls.includeInEnergy.value as boolean;
    const agreementType = form.controls.agreementType.value as number;
    const fuelTypeOptions = getFuelTypeOptions(source, phase, [...context.customFuels], scope, vehicleCategory, vehicleType);
    const selectedFuelTypeOption = fuelTypeOptions.find(option => option.value === fuel);
    const vehicleTypes = VehicleTypes.filter(option => option.category === vehicleCategory);
    const vehicleFuelOptions = getMobileFuelTypes(vehicleCategory, vehicleType, [...context.customFuels]);
    const selectedVehicleFuelOption = vehicleFuelOptions.find(option => option.value === form.controls.vehicleFuel.value);
    const differentUnits = this.energyUnitsHelperService.checkHasDifferentUnits(
      source,
      phase,
      startingUnit,
      fuel,
      context.facility,
      energyUnit
    );
    const selectedUnit = EnergyUnitOptions.find(option => option.value === startingUnit);
    const globalWarmingPotentials = [
      ...context.customGWPs,
      ...GlobalWarmingPotentials
    ];

    return {
      sourceOptions: AllSources,
      scopeOptions: this.getScopeOptions(source),
      phaseOptions: ['Solid', 'Liquid', 'Gas'],
      startingUnitOptions: this.getStartingUnitOptions(form, context.meterDataExists),
      energyUnitOptions: EnergyUnitOptions,
      demandUnitOptions: DemandUnitOptions,
      waterIntakeTypes: WaterIntakeTypes,
      waterDischargeTypes: WaterDischargeTypes,
      agreementTypes: AgreementTypes,
      vehicleCategories: VehicleCategories,
      vehicleTypes,
      vehicleCollectionTypes: VehicleCollectionTypes,
      vehicleCollectionUnitOptions: VolumeLiquidOptions,
      fuelTypeOptions,
      vehicleFuelOptions,
      selectedFuelTypeOption,
      selectedVehicleFuelOption,
      globalWarmingPotentials,
      chargeTypes: getChargeTypes(source),
      months: Months,
      noLongerInUseYearOptions: this.getNoLongerInUseYearOptions(),
      assessmentReportOption: context.account.assessmentReportVersion,
      displayScope: source !== 'Water Intake' && source !== 'Water Discharge',
      displayFuel: source === 'Other Fuels' || source === 'Other Energy',
      displayPhase: source === 'Other Fuels',
      displayHeatCapacity: checkShowHeatCapacity(source, startingUnit, scope),
      displaySiteToSource: checkShowSiteToSource(source, includeInEnergy, scope),
      displayWaterIntakeTypes: source === 'Water Intake',
      displayWaterDischargeTypes: source === 'Water Discharge',
      displayIncludeEnergy: source === 'Electricity' && (agreementType === 2 || agreementType === 3),
      displayRetainRecs: source === 'Electricity' && agreementType !== 1 && agreementType !== 5,
      displayVehicle: scope === 2,
      displayDemandUnit: source === 'Electricity' && scope !== 2,
      displayEnergyUnit: getIsEnergyMeter(source) && !selectedUnit,
      displayGlobalWarmingPotential: scope === 5 || scope === 6,
      energySourceLabel: source === 'Other Energy' ? 'Energy Type' : 'Fuel Type',
      isEnergyMeter: getIsEnergyMeter(source),
      collectionUnitIsEnergy: !!selectedUnit,
      hasDifferentCollectionUnits: differentUnits.differentCollectionUnit,
      hasDifferentEnergyUnits: differentUnits.differentEnergyUnit,
      hasDifferentEmissions: differentUnits.emissionsOutputRate,
      globalWarmingPotentialValue: getGlobalWarmingPotential(
        form.controls.globalWarmingPotentialOption.value,
        context.account.assessmentReportVersion,
        startingUnit,
        globalWarmingPotentials
      )
    };
  }

  getStartingUnitOptions(form: FormGroup, meterDataExists: boolean): UnitOption[] {
    if (!meterDataExists) {
      return getStartingUnitOptions(
        form.controls.source.value,
        form.controls.phase.value,
        form.controls.fuel.value,
        form.controls.scope.value
      ) ?? [];
    }
    return this.energyUnitsHelperService.getStartingUnitOptionsExistingData(
      form.controls.source.value,
      form.controls.phase.value,
      form.controls.fuel.value,
      form.controls.startingUnit.value,
      form.controls.scope.value
    ) ?? [];
  }

  private getScopeOptions(source: MeterSource): ScopeOption[] {
    if (source === 'Electricity') { return [ScopeOptions[2]]; }
    if (source === 'Other Energy') { return [ScopeOptions[3]]; }
    if (source === 'Natural Gas') { return [ScopeOptions[0]]; }
    if (source === 'Other Fuels') {
      return ScopeOptions.filter(option => option.scope === 'Scope 1' && option.value !== 5 && option.value !== 6);
    }
    if (source === 'Other') {
      return ScopeOptions.filter(option => option.value === 100 || option.value === 5 || option.value === 6);
    }
    return [];
  }

  private getNoLongerInUseYearOptions(): number[] {
    return Array.from({ length: new Date().getFullYear() - 1999 }, (_, i) => new Date().getFullYear() - i);
  }
}
