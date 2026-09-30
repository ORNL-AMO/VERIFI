import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { isMeterInvalid } from '@domain/calculations/status-check-calculations/validation/meterValidation';

const CALENDARIZATION_METHODS = new Set(['backward', 'fullYear', 'fullMonth']);

export function getImportMeterIssues(meter: IdbUtilityMeter): string[] {
  const issues: string[] = [];
  if (isMeterInvalid(meter)) issues.push('Meter settings are incomplete or invalid.');
  if (!CALENDARIZATION_METHODS.has(meter.meterReadingDataApplication)) {
    issues.push('Choose a calendarization method.');
  }
  if (meter.scope === 2 && (!meter.vehicleCollectionUnit || !meter.vehicleFuel)) {
    issues.push('Vehicle collection units and fuel are required.');
  }
  return issues;
}

export function isImportMeterValid(meter: IdbUtilityMeter): boolean {
  return getImportMeterIssues(meter).length === 0;
}
