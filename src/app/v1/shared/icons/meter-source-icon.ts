import type { MeterSource } from '@data/models/constantsAndTypes';
import type { IconName } from './icon-registry';

/** Shared source identity for meter and energy-use presentation. */
export function meterSourceIcon(source: MeterSource): IconName {
  switch (source) {
    case 'Electricity': return 'electricity';
    case 'Natural Gas': return 'naturalGas';
    case 'Other Fuels': return 'otherFuel';
    case 'Other Energy': return 'otherEnergy';
    case 'Water Intake': return 'waterIntake';
    case 'Water Discharge': return 'waterDischarge';
    default: return 'meter';
  }
}
