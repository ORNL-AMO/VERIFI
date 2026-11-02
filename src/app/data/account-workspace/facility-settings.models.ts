import { IdbAccount } from '@data/models/idbModels/account';
import { IdbFacility } from '@data/models/idbModels/facility';

const PROFILE_FIELDS = [
  'name', 'country', 'city', 'state', 'zip', 'address', 'naics1', 'naics2', 'naics3',
  'notes', 'color', 'contactName', 'contactEmail', 'contactPhone'
] as const;
const UNIT_FIELDS = [
  'unitsOfMeasure', 'energyUnit', 'electricityUnit', 'massUnit', 'volumeLiquidUnit',
  'volumeGasUnit', 'energyIsSource', 'eGridSubregion'
] as const;
const FINANCIAL_FIELDS = ['fiscalYear', 'fiscalYearMonth', 'fiscalYearCalendarEnd'] as const;

export type FacilitySettingsChange =
  | { readonly group: 'profile'; readonly values: Readonly<Pick<IdbFacility, typeof PROFILE_FIELDS[number] | 'size' | 'classification'>> }
  | { readonly group: 'units'; readonly values: Readonly<Pick<IdbFacility, typeof UNIT_FIELDS[number]>> }
  | { readonly group: 'goals'; readonly values: Readonly<Pick<IdbFacility, 'sustainabilityQuestions' | 'isNewFacility'>> }
  | { readonly group: 'financial'; readonly values: Readonly<Pick<IdbFacility, typeof FINANCIAL_FIELDS[number]>> };

/** Capture only the edited group after the existing form normalization has run. */
export function facilitySettingsChange(group: FacilitySettingsChange['group'], facility: IdbFacility): FacilitySettingsChange {
  switch (group) {
    case 'profile': return { group, values: { ...pickFields(facility, PROFILE_FIELDS), size: facility.size, classification: facility.classification } };
    case 'units': return { group, values: pickFields(facility, UNIT_FIELDS) };
    case 'goals': return { group, values: { sustainabilityQuestions: { ...facility.sustainabilityQuestions }, isNewFacility: facility.isNewFacility } };
    case 'financial': return { group, values: pickFields(facility, FINANCIAL_FIELDS) };
  }
}

export function applyFacilitySettingsChange(facility: IdbFacility, change: FacilitySettingsChange): IdbFacility {
  const updated = { ...facility, ...mirroredValues(change) };
  if (change.group === 'profile') return { ...updated, size: change.values.size, classification: change.values.classification };
  if (change.group === 'goals') return { ...updated, isNewFacility: change.values.isNewFacility };
  return updated;
}

export function applyAccountSettingsChange(account: IdbAccount, change: FacilitySettingsChange): IdbAccount {
  return { ...account, ...mirroredValues(change) };
}

function mirroredValues(change: FacilitySettingsChange) {
  switch (change.group) {
    case 'profile': return pickFields(change.values, PROFILE_FIELDS);
    case 'units': return pickFields(change.values, UNIT_FIELDS);
    case 'goals': return { sustainabilityQuestions: { ...change.values.sustainabilityQuestions } };
    case 'financial': return pickFields(change.values, FINANCIAL_FIELDS);
  }
}

function pickFields<T, K extends keyof T>(record: T, keys: readonly K[]): Pick<T, K> {
  const values = {} as Pick<T, K>;
  for (const key of keys) values[key] = record[key];
  return values;
}
