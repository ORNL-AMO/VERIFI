import { Injectable } from '@angular/core';
import { AccountWorkspaceSnapshot } from '../account-workspace/account-workspace.models';
import { CURRENT_DATA_VERSION } from '../indexedDB/data-migrations/data-migration.models';
import { BackupFile } from '../models/backup-file';
import { IdbAccount } from '../models/idbModels/account';
import { IdbAnalysisItem } from '../models/idbModels/analysisItem';
import { IdbFacility } from '../models/idbModels/facility';
import { IdbUtilityMeterGroup } from '../models/idbModels/utilityMeterGroup';
import { JStatRegressionModel } from '../models/analysis';
import { normalizeAnalysisGroupModelStorage } from '../shared/shared-analysis/calculations/regression-model-recovery';

export interface BackupSnapshotBuilder {
  buildAccountBackup(snapshot: AccountWorkspaceSnapshot): BackupFile;
  buildFacilityBackup(snapshot: AccountWorkspaceSnapshot, facilityGuid: string): BackupFile;
}

@Injectable({ providedIn: 'root' })
export class WorkspaceBackupSnapshotBuilder implements BackupSnapshotBuilder {
  buildAccountBackup(snapshot: AccountWorkspaceSnapshot): BackupFile {
    const facilities = snapshot.facilities.map(facility => structuredClone(facility));
    return {
      dataVersion: CURRENT_DATA_VERSION,
      account: sanitizeAccount(snapshot.account),
      facilities,
      facility: undefined,
      meters: snapshot.meters.map(item => structuredClone(item)),
      meterData: snapshot.meterData.map(item => structuredClone(item)),
      groups: trimGroups(snapshot.meterGroups.map(item => structuredClone(item))),
      accountReports: snapshot.accountReports.map(item => structuredClone(item)),
      accountAnalysisItems: snapshot.accountAnalyses.map(item => structuredClone(item)),
      facilityAnalysisItems: trimAnalysisModels(snapshot.facilityAnalyses, facilities, new Set(snapshot.predictors.map(p => p.guid))),
      predictorData: [],
      predictorDataV2: snapshot.predictorData.map(item => structuredClone(item)),
      predictors: snapshot.predictors.map(item => structuredClone(item)),
      customEmissionsItems: snapshot.customEmissions.map(item => structuredClone(item)),
      customFuels: snapshot.customFuels.map(item => structuredClone(item)),
      customGWPs: snapshot.customGWPs.map(item => structuredClone(item)),
      origin: 'VERIFI',
      backupFileType: 'Account',
      timeStamp: new Date(),
      dataBackupId: newBackupId(),
      facilityReports: snapshot.facilityReports.map(item => structuredClone(item)),
      facilityEnergyUseGroups: snapshot.energyUseGroups.map(item => structuredClone(item)),
      facilityEnergyUseEquipment: snapshot.energyUseEquipment.map(item => structuredClone(item))
    };
  }

  buildFacilityBackup(snapshot: AccountWorkspaceSnapshot, facilityGuid: string): BackupFile {
    const facility = snapshot.facilities.find(item => item.guid === facilityGuid);
    if (!facility) {
      throw new Error('The requested facility does not belong to the active workspace.');
    }
    const clonedFacility = structuredClone(facility);
    return {
      dataVersion: CURRENT_DATA_VERSION,
      account: undefined,
      facilities: [],
      facility: clonedFacility,
      meters: snapshot.meters.filter(item => item.facilityId === facilityGuid).map(item => structuredClone(item)),
      meterData: snapshot.meterData.filter(item => item.facilityId === facilityGuid).map(item => structuredClone(item)),
      groups: trimGroups(snapshot.meterGroups
        .filter(item => item.facilityId === facilityGuid)
        .map(item => structuredClone(item))),
      accountReports: [],
      accountAnalysisItems: [],
      facilityAnalysisItems: trimAnalysisModels(
        snapshot.facilityAnalyses.filter(item => item.facilityId === facilityGuid),
        [clonedFacility],
        new Set(snapshot.predictors.filter(p => p.facilityId === facilityGuid).map(p => p.guid))
      ),
      predictorData: [],
      predictorDataV2: snapshot.predictorData.filter(item => item.facilityId === facilityGuid).map(item => structuredClone(item)),
      predictors: snapshot.predictors.filter(item => item.facilityId === facilityGuid).map(item => structuredClone(item)),
      customEmissionsItems: snapshot.customEmissions.map(item => structuredClone(item)),
      customFuels: snapshot.customFuels.map(item => structuredClone(item)),
      customGWPs: snapshot.customGWPs.map(item => structuredClone(item)),
      origin: 'VERIFI',
      backupFileType: 'Facility',
      timeStamp: new Date(),
      dataBackupId: newBackupId(),
      facilityReports: snapshot.facilityReports.filter(item => item.facilityId === facilityGuid).map(item => structuredClone(item)),
      facilityEnergyUseGroups: snapshot.energyUseGroups.filter(item => item.facilityId === facilityGuid).map(item => structuredClone(item)),
      facilityEnergyUseEquipment: snapshot.energyUseEquipment.filter(item => item.facilityId === facilityGuid).map(item => structuredClone(item))
    };
  }
}

function sanitizeAccount(account: Readonly<IdbAccount>): IdbAccount {
  const {
    dataBackupFilePath,
    dataBackupId,
    lastBackup,
    ...rest
  } = structuredClone(account);
  return rest as IdbAccount;
}

function trimGroups(groups: Array<IdbUtilityMeterGroup>): Array<IdbUtilityMeterGroup> {
  return groups.map(group => {
    delete group.combinedMonthlyData;
    return group;
  });
}

function trimAnalysisModels(
  analysisItems: ReadonlyArray<Readonly<IdbAnalysisItem>>,
  facilities: Array<IdbFacility>,
  predictorGuids: ReadonlySet<string>
): Array<IdbAnalysisItem> {
  return analysisItems.map(item => {
    const facility = facilities.find(candidate => candidate.guid === item.facilityId);
    return {
      ...structuredClone(item),
      groups: item.groups.map(group => {
        const normalizedGroup = normalizeAnalysisGroupModelStorage(
          structuredClone(group),
          facility,
          item.baselineYear
        ).group;
        const trimmedGroup = {
          ...normalizedGroup,
          models: normalizedGroup.models?.map(model => getTrimmedModel(structuredClone(model)))
        };
        trimmedGroup.predictorVariables = trimmedGroup.predictorVariables?.filter(
          v => !v.id || predictorGuids.has(v.id)
        );
        trimmedGroup.models = trimmedGroup.models?.map(model => ({
          ...model,
          predictorVariables: model.predictorVariables?.filter(
            v => !v.id || predictorGuids.has(v.id)
          )
        }));
        return trimmedGroup;
      })
    };
  });
}

function getTrimmedModel(model: JStatRegressionModel): JStatRegressionModel {
  return {
    coef: model.coef,
    R2: model.R2,
    SSE: model.SSE,
    SSR: model.SSR,
    SST: model.SST,
    adjust_R2: model.adjust_R2,
    df_model: model.df_model,
    df_resid: model.df_resid,
    ybar: model.ybar,
    t: {
      se: model.t.se,
      sigmaHat: model.t.sigmaHat,
      p: model.t.p
    },
    f: {
      pvalue: model.f.pvalue,
      F_statistic: model.f.F_statistic
    },
    modelYear: model.modelYear,
    predictorVariables: model.predictorVariables,
    modelId: model.modelId,
    isValid: model.isValid,
    modelPValue: model.modelPValue,
    modelNotes: model.modelNotes,
    errorModeling: model.errorModeling,
    SEPValidation: model.SEPValidation,
    SEPValidationPass: model.SEPValidationPass,
    dataValidationNotes: model.dataValidationNotes,
    modelValidationNotes: model.modelValidationNotes
  };
}

function newBackupId(): string {
  return Math.random().toString(36).slice(2, 11);
}
