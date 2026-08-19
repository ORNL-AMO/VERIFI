import { IdbAccount } from '@data/models/idbModels/account';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { IdbAccountReport } from '@data/models/idbModels/accountReport';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbCustomEmissionsItem } from '@data/models/idbModels/customEmissions';
import { IdbCustomFuel } from '@data/models/idbModels/customFuel';
import { IdbCustomGWP } from '@data/models/idbModels/customGWP';
import { IdbPredictorEntryDeprecated } from '@data/models/idbModels/deprecatedPredictors';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbFacilityEnergyUseEquipment } from '@data/models/idbModels/facilityEnergyUseEquipment';
import { IdbFacilityEnergyUseGroup } from '@data/models/idbModels/facilityEnergyUseGroups';
import { IdbFacilityReport } from '@data/models/idbModels/facilityReport';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { VerifiStoreName } from '../indexed-db-schema';

export const CURRENT_DATA_VERSION = 1;

export interface MigrationData {
  accounts: Array<IdbAccount>;
  facilities: Array<IdbFacility>;
  meters: Array<IdbUtilityMeter>;
  meterData: Array<IdbUtilityMeterData>;
  meterGroups: Array<IdbUtilityMeterGroup>;
  deprecatedPredictorData: Array<IdbPredictorEntryDeprecated>;
  predictors: Array<IdbPredictor>;
  predictorData: Array<IdbPredictorData>;
  facilityAnalyses: Array<IdbAnalysisItem>;
  accountAnalyses: Array<IdbAccountAnalysisItem>;
  accountReports: Array<IdbAccountReport>;
  facilityReports: Array<IdbFacilityReport>;
  customEmissions: Array<IdbCustomEmissionsItem>;
  customFuels: Array<IdbCustomFuel>;
  customGWPs: Array<IdbCustomGWP>;
  energyUseGroups: Array<IdbFacilityEnergyUseGroup>;
  energyUseEquipment: Array<IdbFacilityEnergyUseEquipment>;
}

export type MigrationCollectionName = keyof MigrationData;

export interface MigrationResult {
  data: MigrationData;
  changedCollections: ReadonlyArray<MigrationCollectionName>;
}

export interface DataMigration {
  fromVersion: number;
  toVersion: number;
  description: string;
  affectedStores: ReadonlyArray<VerifiStoreName>;
  migrate(data: MigrationData): MigrationResult;
}

export function emptyMigrationData(): MigrationData {
  return {
    accounts: [], facilities: [], meters: [], meterData: [], meterGroups: [],
    deprecatedPredictorData: [], predictors: [], predictorData: [],
    facilityAnalyses: [], accountAnalyses: [], accountReports: [], facilityReports: [],
    customEmissions: [], customFuels: [], customGWPs: [], energyUseGroups: [],
    energyUseEquipment: []
  };
}
