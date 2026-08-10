/**
 * Defines the readonly snapshot, selection, lifecycle, revision, and error contracts
 * shared by the account workspace store, loader, service, and consumers.
 */
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

export type WorkspaceEntity<T> = Readonly<T>;

export interface AccountWorkspaceSnapshot {
  readonly account: WorkspaceEntity<IdbAccount>;
  readonly facilities: readonly WorkspaceEntity<IdbFacility>[];
  readonly meters: readonly WorkspaceEntity<IdbUtilityMeter>[];
  readonly meterData: readonly WorkspaceEntity<IdbUtilityMeterData>[];
  readonly meterGroups: readonly WorkspaceEntity<IdbUtilityMeterGroup>[];
  readonly predictors: readonly WorkspaceEntity<IdbPredictor>[];
  readonly predictorData: readonly WorkspaceEntity<IdbPredictorData>[];
  readonly facilityAnalyses: readonly WorkspaceEntity<IdbAnalysisItem>[];
  readonly accountAnalyses: readonly WorkspaceEntity<IdbAccountAnalysisItem>[];
  readonly accountReports: readonly WorkspaceEntity<IdbAccountReport>[];
  readonly facilityReports: readonly WorkspaceEntity<IdbFacilityReport>[];
  readonly customEmissions: readonly WorkspaceEntity<IdbCustomEmissionsItem>[];
  readonly customFuels: readonly WorkspaceEntity<IdbCustomFuel>[];
  readonly customGWPs: readonly WorkspaceEntity<IdbCustomGWP>[];
  readonly energyUseGroups: readonly WorkspaceEntity<IdbFacilityEnergyUseGroup>[];
  readonly energyUseEquipment: readonly WorkspaceEntity<IdbFacilityEnergyUseEquipment>[];
}

export type AccountWorkspaceCollectionKey = {
  [K in keyof AccountWorkspaceSnapshot]: AccountWorkspaceSnapshot[K] extends readonly WorkspaceEntity<unknown>[] ? K : never
}[keyof AccountWorkspaceSnapshot];

export type AccountWorkspaceCollectionRecord<K extends AccountWorkspaceCollectionKey> =
  AccountWorkspaceSnapshot[K] extends readonly (infer T)[] ? T : never;

export interface WorkspacePatchRecord {
  readonly id?: number;
  readonly guid?: string;
  readonly accountId?: string;
}

export interface WorkspaceCollectionPatch<K extends AccountWorkspaceCollectionKey = AccountWorkspaceCollectionKey> {
  readonly collection: K;
  readonly upsert?: readonly WorkspacePatchRecord[];
  readonly deleteIds?: readonly number[];
  readonly deleteGuids?: readonly string[];
}

export interface WorkspacePatch {
  readonly account?: WorkspaceEntity<IdbAccount>;
  readonly collections?: readonly WorkspaceCollectionPatch[];
}

export interface WorkspaceSelections {
  readonly facility?: WorkspaceEntity<IdbFacility>;
  readonly meter?: WorkspaceEntity<IdbUtilityMeter>;
  readonly predictor?: WorkspaceEntity<IdbPredictor>;
  readonly facilityAnalysis?: WorkspaceEntity<IdbAnalysisItem>;
  readonly accountAnalysis?: WorkspaceEntity<IdbAccountAnalysisItem>;
  readonly accountReport?: WorkspaceEntity<IdbAccountReport>;
  readonly facilityReport?: WorkspaceEntity<IdbFacilityReport>;
  readonly energyUseGroup?: WorkspaceEntity<IdbFacilityEnergyUseGroup>;
  readonly energyUseEquipment?: WorkspaceEntity<IdbFacilityEnergyUseEquipment>;
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
  readonly pendingOperations: readonly PendingOperation[];
}

/** Lightweight pending-operation record tracked inside the workspace state. */
export interface PendingOperation {
  readonly id: number;
  readonly label: string;
}

export type WorkspaceLoadResult = 'published' | 'superseded';

export class WorkspaceSelectionError extends Error {
  readonly code = 'invalid-selection';

  constructor(message: string) {
    super(message);
    this.name = 'WorkspaceSelectionError';
  }
}
