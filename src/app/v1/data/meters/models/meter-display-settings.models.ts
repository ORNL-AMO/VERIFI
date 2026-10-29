import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { checkShowSiteToSource, getIsEnergyMeter, getIsEnergyUnit } from '@shared/sharedHelperFunctions';
import { EnergyUnitOptions } from '@shared/unitOptions';

export interface MeterDisplaySettings {
  readonly showEnergyUnit: boolean;
  readonly showSiteToSource: boolean;
  readonly energyUnit: string;
  readonly energyIsSource: boolean;
  readonly inheritsEnergyUnit: boolean;
  readonly inheritsEnergyIsSource: boolean;
}

export function resolveMeterDisplaySettings(
  meter: IdbUtilityMeter,
  facility: IdbFacility
): MeterDisplaySettings {
  const validUnitOverride = meter.displayEnergyUnit
    && EnergyUnitOptions.some(option => option.value === meter.displayEnergyUnit)
    ? meter.displayEnergyUnit
    : undefined;
  const showEnergyUnit = meter.source === 'Other'
    ? getIsEnergyUnit(meter.startingUnit)
    : getIsEnergyMeter(meter.source);
  const showSiteToSource = showEnergyUnit
    && checkShowSiteToSource(meter.source, meter.includeInEnergy, meter.scope)
    && typeof meter.siteToSource === 'number'
    && Number.isFinite(meter.siteToSource)
    && meter.siteToSource >= 0
    && meter.siteToSource !== 1;
  return {
    showEnergyUnit,
    showSiteToSource,
    energyUnit: validUnitOverride ?? facility.energyUnit,
    energyIsSource: showSiteToSource
      ? meter.displayEnergyIsSource ?? facility.energyIsSource
      : facility.energyIsSource,
    inheritsEnergyUnit: validUnitOverride === undefined,
    inheritsEnergyIsSource: meter.displayEnergyIsSource === undefined
  };
}
