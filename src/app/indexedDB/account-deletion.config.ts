export interface AccountDeletionStoreDefinition {
  storeName: string;
  message: string;
}

export const ACCOUNT_DELETION_STORES: ReadonlyArray<AccountDeletionStoreDefinition> = [
  { storeName: 'predictorData', message: 'Deleting Predictor Data' },
  { storeName: 'predictor', message: 'Deleting Predictors' },
  { storeName: 'predictors', message: 'Deleting Legacy Predictors' },
  { storeName: 'utilityMeterData', message: 'Deleting Meter Data' },
  { storeName: 'utilityMeter', message: 'Deleting Meters' },
  { storeName: 'utilityMeterGroups', message: 'Deleting Meter Groups' },
  { storeName: 'facilityEnergyUseEquipment', message: 'Deleting Energy Use Equipment' },
  { storeName: 'facilityEnergyUseGroups', message: 'Deleting Energy Use Groups' },
  { storeName: 'analysisItems', message: 'Deleting Facility Analyses' },
  { storeName: 'facilityReports', message: 'Deleting Facility Reports' },
  { storeName: 'accountAnalysisItems', message: 'Deleting Account Analyses' },
  { storeName: 'accountReports', message: 'Deleting Account Reports' },
  { storeName: 'customEmissionsItems', message: 'Deleting Custom Emissions' },
  { storeName: 'customFuels', message: 'Deleting Custom Fuels' },
  { storeName: 'customGWP', message: 'Deleting Custom GWPs' },
  { storeName: 'electronBackups', message: 'Deleting Electron Backup Settings' },
  { storeName: 'facilities', message: 'Deleting Facilities' }
];

export const ACCOUNT_ROOT_STORE = 'accounts';

export const GLOBAL_PERSISTENCE_STORES: ReadonlyArray<string> = [
  'analyticsData',
  'application'
];
