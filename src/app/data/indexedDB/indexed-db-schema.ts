export const VERIFI_DB_NAME = 'verifi';
export const VERIFI_DB_VERSION = 20;

export const VERIFI_STORE_NAMES = [
  'accounts',
  'facilities',
  'utilityMeter',
  'utilityMeterData',
  'utilityMeterGroups',
  'predictors',
  'analysisItems',
  'accountAnalysisItems',
  'customEmissionsItems',
  'accountReports',
  'electronBackups',
  'analyticsData',
  'customFuels',
  'customGWP',
  'predictor',
  'predictorData',
  'facilityReports',
  'application',
  'facilityEnergyUseGroups',
  'facilityEnergyUseEquipment'
] as const;

export type VerifiStoreName = typeof VERIFI_STORE_NAMES[number];
export type VerifiRelationshipIndexName =
  | 'guid'
  | 'accountId'
  | 'facilityId'
  | 'meterId'
  | 'predictorId'
  | 'groupId'
  | 'energyUseGroupId';

export interface VerifiIndexDefinition {
  name: string;
  keypath: string;
  options: {
    unique: false;
  };
}

const GUID_STORES: ReadonlyArray<VerifiStoreName> = [
  'accounts',
  'facilities',
  'utilityMeter',
  'utilityMeterData',
  'utilityMeterGroups',
  'predictors',
  'analysisItems',
  'accountAnalysisItems',
  'customEmissionsItems',
  'accountReports',
  'electronBackups',
  'customFuels',
  'customGWP',
  'predictor',
  'predictorData',
  'facilityReports',
  'application',
  'facilityEnergyUseGroups',
  'facilityEnergyUseEquipment'
];

const ACCOUNT_OWNED_STORES: ReadonlyArray<VerifiStoreName> = [
  'facilities',
  'utilityMeter',
  'utilityMeterData',
  'utilityMeterGroups',
  'predictors',
  'analysisItems',
  'accountAnalysisItems',
  'customEmissionsItems',
  'accountReports',
  'electronBackups',
  'customFuels',
  'customGWP',
  'predictor',
  'predictorData',
  'facilityReports',
  'facilityEnergyUseGroups',
  'facilityEnergyUseEquipment'
];

const FACILITY_OWNED_STORES: ReadonlyArray<VerifiStoreName> = [
  'utilityMeter',
  'utilityMeterData',
  'utilityMeterGroups',
  'predictors',
  'analysisItems',
  'predictor',
  'predictorData',
  'facilityReports',
  'facilityEnergyUseGroups',
  'facilityEnergyUseEquipment'
];

function index(name: string, keypath: string = name): VerifiIndexDefinition {
  return { name, keypath, options: { unique: false } };
}

function buildRequiredIndexes(): Readonly<Record<VerifiStoreName, ReadonlyArray<VerifiIndexDefinition>>> {
  const indexes = Object.fromEntries(
    VERIFI_STORE_NAMES.map(storeName => [storeName, [] as Array<VerifiIndexDefinition>])
  ) as Record<VerifiStoreName, Array<VerifiIndexDefinition>>;

  for (const storeName of GUID_STORES) {
    indexes[storeName].push(index('guid'));
  }
  for (const storeName of ACCOUNT_OWNED_STORES) {
    indexes[storeName].push(index('accountId'));
  }
  for (const storeName of FACILITY_OWNED_STORES) {
    indexes[storeName].push(index('facilityId'));
  }

  indexes.utilityMeter.push(index('groupId'), index('location'));
  indexes.utilityMeterData.push(index('meterId'));
  indexes.predictorData.push(index('predictorId'));
  indexes.facilityEnergyUseEquipment.push(index('energyUseGroupId'));

  return indexes;
}

export const REQUIRED_INDEXES = buildRequiredIndexes();

export function mergeRequiredIndexes<T extends { name: string }>(
  storeName: VerifiStoreName,
  configuredIndexes: ReadonlyArray<T>
): Array<T | VerifiIndexDefinition> {
  const requiredIndexes = REQUIRED_INDEXES[storeName];
  const requiredNames = new Set(requiredIndexes.map(requiredIndex => requiredIndex.name));
  return [
    ...configuredIndexes.filter(configuredIndex => !requiredNames.has(configuredIndex.name)),
    ...requiredIndexes
  ];
}

export function migrateVersion20(database: IDBDatabase, transaction: IDBTransaction): void {
  for (const storeName of VERIFI_STORE_NAMES) {
    if (!database.objectStoreNames.contains(storeName)) {
      continue;
    }

    const objectStore = transaction.objectStore(storeName);
    for (const requiredIndex of REQUIRED_INDEXES[storeName]) {
      if (objectStore.indexNames.contains(requiredIndex.name)) {
        const existingIndex = objectStore.index(requiredIndex.name);
        if (keyPathsEqual(existingIndex.keyPath, requiredIndex.keypath)
          && existingIndex.unique === requiredIndex.options.unique) {
          continue;
        }
        objectStore.deleteIndex(requiredIndex.name);
      }
      objectStore.createIndex(requiredIndex.name, requiredIndex.keypath, requiredIndex.options);
    }
  }
}

export function verifiMigrationFactory(): {
  [version: number]: (database: IDBDatabase, transaction: IDBTransaction) => void;
} {
  return {
    [VERIFI_DB_VERSION]: migrateVersion20
  };
}

function keyPathsEqual(existingKeyPath: string | string[], requiredKeyPath: string): boolean {
  return typeof existingKeyPath === 'string' && existingKeyPath === requiredKeyPath;
}
