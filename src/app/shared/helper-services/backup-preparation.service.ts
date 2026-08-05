import { Injectable } from '@angular/core';
import { BackupFile } from '../../models/backup-file';
import { FutureDataVersionError, InvalidDataVersionError, validateDataVersion } from '../../indexedDB/data-migrations/data-migration.errors';
import { DATA_MIGRATIONS } from '../../indexedDB/data-migrations/data-migration.registry';
import { CURRENT_DATA_VERSION, MigrationData } from '../../indexedDB/data-migrations/data-migration.models';

export type PreparedBackupFile = BackupFile & { dataVersion: typeof CURRENT_DATA_VERSION };

export class InvalidBackupError extends Error {
  constructor(message = 'Selected file is not a valid VERIFI backup.') {
    super(message);
    this.name = 'InvalidBackupError';
  }
}

export class FutureBackupVersionError extends Error {
  constructor(readonly dataVersion: number) {
    super('This backup was created by a newer version of VERIFI. Update VERIFI before importing it.');
    this.name = 'FutureBackupVersionError';
  }
}

export class BackupMigrationError extends Error {
  constructor(readonly cause: unknown) {
    super('VERIFI could not migrate this backup to the current data version.');
    this.name = 'BackupMigrationError';
  }
}

export class BackupRelationshipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupRelationshipError';
  }
}

const COLLECTION_FIELDS = [
  'facilities', 'meters', 'meterData', 'groups', 'accountReports', 'accountAnalysisItems',
  'facilityAnalysisItems', 'predictorData', 'predictorDataV2', 'predictors',
  'customEmissionsItems', 'customFuels', 'customGWPs', 'facilityReports',
  'facilityEnergyUseGroups', 'facilityEnergyUseEquipment'
] as const;

@Injectable({ providedIn: 'root' })
export class BackupPreparationService {
  prepare(input: unknown): PreparedBackupFile {
    const backup = this.cloneAndValidateEnvelope(input);
    let version: number;
    try {
      version = backup.dataVersion === undefined ? 0 : validateDataVersion(backup.dataVersion);
    } catch (error) {
      if (error instanceof InvalidDataVersionError) {
        throw new InvalidBackupError('This VERIFI backup has an invalid data version.');
      }
      throw error;
    }
    if (version > CURRENT_DATA_VERSION) {
      throw new FutureBackupVersionError(version);
    }

    try {
      let data = backupToMigrationData(backup);
      while (version < CURRENT_DATA_VERSION) {
        const migration = DATA_MIGRATIONS.find(item => item.fromVersion === version);
        if (!migration) { throw new Error(`No migration exists for backup data version ${version}.`); }
        data = migration.migrate(data).data;
        version = migration.toVersion;
      }
      applyMigrationDataToBackup(backup, data);
    } catch (error) {
      if (error instanceof FutureDataVersionError) { throw new FutureBackupVersionError(error.dataVersion); }
      throw new BackupMigrationError(error);
    }

    backup.dataVersion = CURRENT_DATA_VERSION;
    validateCoreRelationships(backup);
    return backup as PreparedBackupFile;
  }

  private cloneAndValidateEnvelope(input: unknown): BackupFile {
    if (!input || typeof input !== 'object') { throw new InvalidBackupError(); }
    const backup = structuredClone(input) as Record<string, unknown>;
    if (backup.origin !== 'VERIFI' || (backup.backupFileType !== 'Account' && backup.backupFileType !== 'Facility')) {
      throw new InvalidBackupError();
    }
    if (backup.backupFileType === 'Account' && (!backup.account || typeof backup.account !== 'object')) {
      throw new InvalidBackupError('This account backup does not contain an account record.');
    }
    if (backup.backupFileType === 'Facility' && (!backup.facility || typeof backup.facility !== 'object')) {
      throw new InvalidBackupError('This facility backup does not contain a facility record.');
    }
    for (const field of COLLECTION_FIELDS) {
      if (backup[field] === undefined) { backup[field] = []; }
      if (!Array.isArray(backup[field])) {
        throw new InvalidBackupError(`The backup collection "${field}" is invalid.`);
      }
    }
    return backup as unknown as BackupFile;
  }
}

export function backupToMigrationData(backup: BackupFile): MigrationData {
  return {
    accounts: backup.backupFileType === 'Account' ? [backup.account] : [],
    facilities: backup.backupFileType === 'Account' ? backup.facilities : [backup.facility],
    meters: backup.meters,
    meterData: backup.meterData,
    meterGroups: backup.groups,
    deprecatedPredictorData: backup.predictorData,
    predictors: backup.predictors,
    predictorData: backup.predictorDataV2,
    facilityAnalyses: backup.facilityAnalysisItems,
    accountAnalyses: backup.accountAnalysisItems,
    accountReports: backup.accountReports,
    facilityReports: backup.facilityReports,
    customEmissions: backup.customEmissionsItems,
    customFuels: backup.customFuels,
    customGWPs: backup.customGWPs,
    energyUseGroups: backup.facilityEnergyUseGroups,
    energyUseEquipment: backup.facilityEnergyUseEquipment
  };
}

function applyMigrationDataToBackup(backup: BackupFile, data: MigrationData): void {
  if (backup.backupFileType === 'Account') {
    backup.account = data.accounts[0];
    backup.facilities = data.facilities;
  } else {
    backup.facility = data.facilities[0];
  }
  backup.meters = data.meters;
  backup.meterData = data.meterData;
  backup.groups = data.meterGroups;
  backup.predictorData = data.deprecatedPredictorData;
  backup.predictors = data.predictors;
  backup.predictorDataV2 = data.predictorData;
  backup.facilityAnalysisItems = data.facilityAnalyses;
  backup.accountAnalysisItems = data.accountAnalyses;
  backup.accountReports = data.accountReports;
  backup.facilityReports = data.facilityReports;
  backup.customEmissionsItems = data.customEmissions;
  backup.customFuels = data.customFuels;
  backup.customGWPs = data.customGWPs;
  backup.facilityEnergyUseGroups = data.energyUseGroups;
  backup.facilityEnergyUseEquipment = data.energyUseEquipment;
}

function validateCoreRelationships(backup: BackupFile): void {
  const facilities = backup.backupFileType === 'Account' ? backup.facilities : [backup.facility];
  const facilityIds = new Set(facilities.map(item => item.guid));
  const groupIds = new Set(backup.groups.map(item => item.guid));
  const meterIds = new Set(backup.meters.map(item => item.guid));
  const predictorIds = new Set(backup.predictors.map(item => item.guid));
  const energyGroupIds = new Set(backup.facilityEnergyUseGroups.map(item => item.guid));

  if (backup.backupFileType === 'Account') {
    const accountId = backup.account.guid;
    requireAll(backup.facilities, item => item.accountId === accountId, 'A facility does not belong to the backup account.');
    const accountOwned = [
      ...backup.meters, ...backup.meterData, ...backup.groups, ...backup.predictors,
      ...backup.predictorDataV2, ...backup.facilityAnalysisItems, ...backup.accountAnalysisItems,
      ...backup.accountReports, ...backup.facilityReports, ...backup.customEmissionsItems,
      ...backup.customFuels, ...backup.customGWPs, ...backup.facilityEnergyUseGroups,
      ...backup.facilityEnergyUseEquipment
    ];
    requireAll(accountOwned, item => item.accountId === accountId, 'A record does not belong to the backup account.');
  }

  const facilityOwned = [
    ...backup.meters, ...backup.meterData, ...backup.groups, ...backup.predictors,
    ...backup.predictorDataV2, ...backup.facilityAnalysisItems, ...backup.facilityReports,
    ...backup.facilityEnergyUseGroups, ...backup.facilityEnergyUseEquipment
  ];
  requireAll(facilityOwned, item => facilityIds.has(item.facilityId), 'A record references a facility that is not in the backup.');
  requireAll(backup.meters, meter => !meter.groupId || groupIds.has(meter.groupId), 'A meter references a missing meter group.');
  requireAll(backup.meterData, reading => meterIds.has(reading.meterId), 'A meter reading references a missing meter.');
  requireAll(backup.predictorDataV2, reading => predictorIds.has(reading.predictorId), 'A predictor reading references a missing predictor.');
  requireAll(backup.facilityEnergyUseEquipment, equipment =>
    energyGroupIds.has(equipment.energyUseGroupId)
      && (equipment.utilityMeterGroupIds ?? []).every(groupId => groupIds.has(groupId)),
  'Energy-use equipment references a missing energy-use or meter group.');

  for (const analysis of backup.facilityAnalysisItems) {
    for (const group of analysis.groups ?? []) {
      if (group.idbGroupId && !groupIds.has(group.idbGroupId)) {
        throw new BackupRelationshipError('An analysis references a missing meter group.');
      }
      const variables = [
        ...(group.predictorVariables ?? []),
        ...(group.models ?? []).flatMap(model => model.predictorVariables ?? [])
      ];
      if (variables.some(variable => variable.id && !predictorIds.has(variable.id))) {
        throw new BackupRelationshipError('An analysis references a missing predictor.');
      }
    }
  }
}

function requireAll<T>(items: Array<T>, predicate: (item: T) => boolean, message: string): void {
  if (!items.every(predicate)) { throw new BackupRelationshipError(message); }
}
