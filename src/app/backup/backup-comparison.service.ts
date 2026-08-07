import { Injectable } from '@angular/core';
import { AccountWorkspaceQueryService } from '../account-workspace/account-workspace-query.service';
import { AccountWorkspaceStore } from '../account-workspace/account-workspace.store';
import { BackupFile } from '../models/backup-file';
import { IdbPredictorData } from '../models/idbModels/predictorData';
import { IdbUtilityMeterData } from '../models/idbModels/utilityMeterData';

export type BackupDifference =
  | 'New Facility'
  | 'Meter Groups'
  | 'Meters'
  | 'Meter Data'
  | 'Predictors'
  | 'Predictor Data';

export interface FacilityBackupDifference {
  readonly facilityName: string;
  readonly differences: Array<BackupDifference>;
}

@Injectable({ providedIn: 'root' })
export class BackupComparisonService {
  constructor(
    private readonly workspaceStore: AccountWorkspaceStore,
    private readonly workspaceQuery: AccountWorkspaceQueryService
  ) { }

  comparePreparedAccountBackup(backup: BackupFile): Array<FacilityBackupDifference> {
    const accountFacilities = this.workspaceStore.facilities();
    const accountGroups = this.workspaceStore.meterGroups();

    return backup.facilities.map(facility => {
      const accountFacility = accountFacilities.find(item => item.name === facility.name);
      if (!accountFacility) {
        return { facilityName: facility.name, differences: ['New Facility'] };
      }

      const differences: Array<BackupDifference> = [];
      const backupGroups = backup.groups.filter(item => item.facilityId === facility.guid);
      const facilityGroups = accountGroups.filter(item => item.facilityId === accountFacility.guid);
      if (
        backupGroups.some(bg => !facilityGroups.some(ag => ag.name === bg.name && ag.groupType === bg.groupType))
        || facilityGroups.some(ag => !backupGroups.some(bg => bg.name === ag.name && bg.groupType === ag.groupType))
      ) {
        differences.push('Meter Groups');
      }

      const backupMeters = backup.meters.filter(item => item.facilityId === facility.guid);
      const facilityMeters = this.workspaceQuery.getFacilityMeters(accountFacility.guid);
      if (
        backupMeters.some(bm => !facilityMeters.some(am => am.name === bm.name && am.meterNumber === bm.meterNumber))
        || facilityMeters.some(am => !backupMeters.some(bm => bm.name === am.name && bm.meterNumber === am.meterNumber))
      ) {
        differences.push('Meters');
      }

      const backupMeterData = backup.meterData.filter(item => item.facilityId === facility.guid);
      const facilityMeterData = this.workspaceQuery.getFacilityMeterData(accountFacility.guid);
      if (
        backupMeterData.some(bmd => !facilityMeterData.some(amd => meterDataMatches(amd, bmd)))
        || facilityMeterData.some(amd => !backupMeterData.some(bmd => meterDataMatches(amd, bmd)))
      ) {
        differences.push('Meter Data');
      }

      const backupPredictors = backup.predictors.filter(item => item.facilityId === facility.guid);
      const facilityPredictors = this.workspaceQuery.getFacilityPredictors(accountFacility.guid);
      if (
        backupPredictors.some(bp => !facilityPredictors.some(ap => ap.name === bp.name))
        || facilityPredictors.some(ap => !backupPredictors.some(bp => bp.name === ap.name))
      ) {
        differences.push('Predictors');
      }

      const backupPredictorData = backup.predictorDataV2.filter(item => item.facilityId === facility.guid);
      const facilityPredictorData = this.workspaceQuery.getFacilityPredictorData(accountFacility.guid);
      if (
        backupPredictorData.some(bpd => !facilityPredictorData.some(apd => predictorDataMatches(apd, bpd)))
        || facilityPredictorData.some(apd => !backupPredictorData.some(bpd => predictorDataMatches(apd, bpd)))
      ) {
        differences.push('Predictor Data');
      }

      return { facilityName: facility.name, differences };
    });
  }
}

function meterDataMatches(accountData: IdbUtilityMeterData, backupData: IdbUtilityMeterData): boolean {
  const backupYmd = getYmd(backupData);
  return accountData.totalEnergyUse === backupData.totalEnergyUse
    && accountData.meterNumber === backupData.meterNumber
    && accountData.year === backupYmd.year
    && accountData.month === backupYmd.month
    && accountData.day === backupYmd.day;
}

function predictorDataMatches(accountData: IdbPredictorData, backupData: IdbPredictorData): boolean {
  const backupYm = getYm(backupData);
  return accountData.amount === backupData.amount
    && accountData.year === backupYm.year
    && accountData.month === backupYm.month;
}

function getYmd(entry: any): { year: number; month: number; day: number } {
  if ('readDate' in entry && entry.readDate) {
    const date = new Date(entry.readDate);
    return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
  }
  return { year: entry.year, month: entry.month, day: entry.day };
}

function getYm(entry: any): { year: number; month: number } {
  if ('date' in entry && entry.date) {
    const date = new Date(entry.date);
    return { year: date.getFullYear(), month: date.getMonth() + 1 };
  }
  return { year: entry.year, month: entry.month };
}
