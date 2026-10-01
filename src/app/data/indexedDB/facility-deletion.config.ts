import { VerifiStoreName } from './indexed-db-schema';

export interface FacilityDeletionStoreDefinition {
  storeName: VerifiStoreName;
  message: string;
}

export const FACILITY_DELETION_CHILD_STORES = [
  { storeName: 'predictors', message: 'Deleting Facility Predictors' },
  { storeName: 'predictor', message: 'Deleting Facility Predictors' },
  { storeName: 'predictorData', message: 'Deleting Facility Predictor Data' },
  { storeName: 'utilityMeterData', message: 'Deleting Facility Meter Data' },
  { storeName: 'utilityMeter', message: 'Deleting Facility Meters' },
  { storeName: 'utilityMeterGroups', message: 'Deleting Facility Meter Groups' },
  { storeName: 'facilityReports', message: 'Deleting Facility Reports' },
  { storeName: 'analysisItems', message: 'Deleting Facility Analysis Items' },
  { storeName: 'facilityEnergyUseEquipment', message: 'Deleting Facility Energy Use Equipment' },
  { storeName: 'facilityEnergyUseGroups', message: 'Deleting Facility Energy Use Groups' }
] as const satisfies ReadonlyArray<FacilityDeletionStoreDefinition>;

export const FACILITY_REFERENCE_STORES = [
  { storeName: 'accountReports', message: 'Updating Account Reports' },
  { storeName: 'accountAnalysisItems', message: 'Updating Account Analysis Items' }
] as const satisfies ReadonlyArray<FacilityDeletionStoreDefinition>;

export const FACILITY_ROOT_STORE: VerifiStoreName = 'facilities';

export const FACILITY_DELETION_PARTICIPANT_STORES: ReadonlyArray<VerifiStoreName> = [
  ...FACILITY_DELETION_CHILD_STORES.map(definition => definition.storeName),
  ...FACILITY_REFERENCE_STORES.map(definition => definition.storeName),
  FACILITY_ROOT_STORE
];

export const FACILITY_DELETION_MESSAGES: ReadonlyArray<string> = [
  ...FACILITY_DELETION_CHILD_STORES.map(definition => definition.message),
  ...FACILITY_REFERENCE_STORES.map(definition => definition.message),
  'Deleting Facility'
];
