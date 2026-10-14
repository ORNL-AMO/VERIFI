import { AccountAndFacility, DataStalenessSettings, ExpectedRangeSettings } from '@data/models/idbModels/accountAndFacility';
import { DEFAULT_DATA_STALENESS_MONTHS } from '@domain/calculations/status-check-calculations/statusCheckModels';

export type DataValidationSettingsGroup = 'staleness' | 'expectedRange';
export type DataValidationSettingsChange =
  | { readonly group: 'staleness'; readonly settings: DataStalenessSettings }
  | { readonly group: 'expectedRange'; readonly settings: ExpectedRangeSettings };

export function normalizeExpectedRangeSettings(settings?: ExpectedRangeSettings): ExpectedRangeSettings {
  return { enabled: settings?.enabled ?? true };
}

export function effectiveExpectedRangeSettings(account: AccountAndFacility, facility?: AccountAndFacility): ExpectedRangeSettings {
  const local = facility?.expectedRangeSettings;
  return normalizeExpectedRangeSettings(facility && local?.useAccountSettings === false ? local : account.expectedRangeSettings);
}

export function normalizeStalenessSettings(settings?: DataStalenessSettings): DataStalenessSettings {
  return { enabled: settings?.enabled ?? true, thresholdMonths: settings?.thresholdMonths ?? DEFAULT_DATA_STALENESS_MONTHS };
}

export function effectiveStalenessSettings(account: AccountAndFacility, facility?: AccountAndFacility): DataStalenessSettings {
  const local = facility?.dataStalenessSettings;
  // Preserve the established treatment of older facility settings without an inheritance flag.
  return normalizeStalenessSettings(local?.useAccountSettings ? account.dataStalenessSettings : local ?? account.dataStalenessSettings);
}

export function applyDataValidationSettings<T extends AccountAndFacility>(record: T, change: DataValidationSettingsChange, accountLevel = false): T {
  const settings = { ...change.settings };
  if (accountLevel) delete settings.useAccountSettings;
  return change.group === 'staleness'
    ? { ...record, dataStalenessSettings: settings as DataStalenessSettings }
    : { ...record, expectedRangeSettings: settings };
}
