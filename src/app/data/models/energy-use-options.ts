import type { MeterSource } from './constantsAndTypes';
import type { EquipmentType } from './idbModels/facilityEnergyUseEquipment';

/** Supported setup choices; existing imported values are retained when untouched. */
export const ENERGY_USE_SOURCES: readonly MeterSource[] = ['Electricity', 'Natural Gas', 'Other Fuels', 'Other Energy'];
export const ENERGY_USE_CATEGORIES: readonly EquipmentType[] = ['Pump', 'Fan', 'Process Heating', 'Compressed Air', 'Steam',
  'Process Cooling', 'Motor', 'Lighting', 'HVAC', 'Mobile', 'Other'];
