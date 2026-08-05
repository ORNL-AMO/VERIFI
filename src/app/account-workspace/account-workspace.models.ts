import { IdbAccount } from '../models/idbModels/account';
import { IdbAccountAnalysisItem } from '../models/idbModels/accountAnalysisItem';
import { IdbAccountReport } from '../models/idbModels/accountReport';
import { IdbAnalysisItem } from '../models/idbModels/analysisItem';
import { IdbCustomEmissionsItem } from '../models/idbModels/customEmissions';
import { IdbCustomFuel } from '../models/idbModels/customFuel';
import { IdbCustomGWP } from '../models/idbModels/customGWP';
import { IdbFacility } from '../models/idbModels/facility';
import { IdbFacilityEnergyUseEquipment } from '../models/idbModels/facilityEnergyUseEquipment';
import { IdbFacilityEnergyUseGroup } from '../models/idbModels/facilityEnergyUseGroups';
import { IdbFacilityReport } from '../models/idbModels/facilityReport';
import { IdbPredictor } from '../models/idbModels/predictor';
import { IdbPredictorData } from '../models/idbModels/predictorData';
import { IdbUtilityMeter } from '../models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '../models/idbModels/utilityMeterData';
import { IdbUtilityMeterGroup } from '../models/idbModels/utilityMeterGroup';

export type WorkspaceStatus = 'idle' | 'loading' | 'switching' | 'ready' | 'error';

export interface AccountWorkspaceSnapshot {
  readonly account: IdbAccount;
  readonly facilities: readonly IdbFacility[];
  readonly meters: readonly IdbUtilityMeter[];
  readonly meterData: readonly IdbUtilityMeterData[];
  readonly meterGroups: readonly IdbUtilityMeterGroup[];
  readonly predictors: readonly IdbPredictor[];
  readonly predictorData: readonly IdbPredictorData[];
  readonly facilityAnalyses: readonly IdbAnalysisItem[];
  readonly accountAnalyses: readonly IdbAccountAnalysisItem[];
  readonly accountReports: readonly IdbAccountReport[];
  readonly facilityReports: readonly IdbFacilityReport[];
  readonly customEmissions: readonly IdbCustomEmissionsItem[];
  readonly customFuels: readonly IdbCustomFuel[];
  readonly customGWPs: readonly IdbCustomGWP[];
  readonly energyUseGroups: readonly IdbFacilityEnergyUseGroup[];
  readonly energyUseEquipment: readonly IdbFacilityEnergyUseEquipment[];
}

export interface WorkspaceSelections {
  readonly facility?: IdbFacility;
  readonly meter?: IdbUtilityMeter;
  readonly predictor?: IdbPredictor;
  readonly facilityAnalysis?: IdbAnalysisItem;
  readonly accountAnalysis?: IdbAccountAnalysisItem;
  readonly accountReport?: IdbAccountReport;
  readonly facilityReport?: IdbFacilityReport;
  readonly energyUseGroup?: IdbFacilityEnergyUseGroup;
  readonly energyUseEquipment?: IdbFacilityEnergyUseEquipment;
}

export interface WorkspaceCommittedRevision {
  readonly accountGuid: string;
  readonly revision: number;
}

export type WorkspaceErrorCode =
  | 'account-not-found'
  | 'invalid-account-data'
  | 'invalid-selection'
  | 'load-failed';

export interface WorkspaceError {
  readonly code: WorkspaceErrorCode;
  readonly message: string;
  readonly accountGuid?: string;
  readonly cause?: unknown;
}

export interface AccountWorkspaceState {
  readonly status: WorkspaceStatus;
  readonly snapshot?: AccountWorkspaceSnapshot;
  readonly selections: WorkspaceSelections;
  readonly revision: number;
  readonly committedRevision?: WorkspaceCommittedRevision;
  readonly error?: WorkspaceError;
}

export type WorkspaceLoadResult = 'published' | 'superseded';

export class WorkspaceSelectionError extends Error {
  readonly code = 'invalid-selection';

  constructor(message: string) {
    super(message);
    this.name = 'WorkspaceSelectionError';
  }
}
