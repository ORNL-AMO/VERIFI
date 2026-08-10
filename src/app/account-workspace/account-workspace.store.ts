/**
 * Owns the active account workspace as one private signal and exposes readonly, derived signals.
 * Snapshot publication and selection validation occur atomically through this store.
 */
import { computed, Injectable, signal } from '@angular/core';
import {
  AccountWorkspaceSnapshot,
  AccountWorkspaceState,
  AccountWorkspaceCollectionKey,
  PendingOperation,
  WorkspacePatch,
  WorkspaceError,
  WorkspaceSelections,
  WorkspaceSelectionError
} from './account-workspace.models';
import { IdbFacility } from '../models/idbModels/facility';

const INITIAL_WORKSPACE_STATE: AccountWorkspaceState = {
  status: 'idle',
  selections: {},
  revision: 0,
  pendingOperations: []
};

@Injectable({ providedIn: 'root' })
export class AccountWorkspaceStore {
  private readonly writableState = signal<AccountWorkspaceState>(INITIAL_WORKSPACE_STATE);

  readonly state = this.writableState.asReadonly();
  readonly status = computed(() => this.state().status);
  readonly snapshot = computed(() => this.state().snapshot);
  readonly account = computed(() => this.snapshot()?.account);
  readonly facilities = computed(() => this.snapshot()?.facilities ?? []);
  readonly meters = computed(() => this.snapshot()?.meters ?? []);
  readonly meterData = computed(() => this.snapshot()?.meterData ?? []);
  readonly meterGroups = computed(() => this.snapshot()?.meterGroups ?? []);
  readonly predictors = computed(() => this.snapshot()?.predictors ?? []);
  readonly predictorData = computed(() => this.snapshot()?.predictorData ?? []);
  readonly facilityAnalyses = computed(() => this.snapshot()?.facilityAnalyses ?? []);
  readonly accountAnalyses = computed(() => this.snapshot()?.accountAnalyses ?? []);
  readonly accountReports = computed(() => this.snapshot()?.accountReports ?? []);
  readonly facilityReports = computed(() => this.snapshot()?.facilityReports ?? []);
  readonly customEmissions = computed(() => this.snapshot()?.customEmissions ?? []);
  readonly customFuels = computed(() => this.snapshot()?.customFuels ?? []);
  readonly customGWPs = computed(() => this.snapshot()?.customGWPs ?? []);
  readonly energyUseGroups = computed(() => this.snapshot()?.energyUseGroups ?? []);
  readonly energyUseEquipment = computed(() => this.snapshot()?.energyUseEquipment ?? []);
  readonly selections = computed(() => this.state().selections);
  readonly selectedFacility = computed(() => this.selections().facility);
  readonly selectedMeter = computed(() => this.selections().meter);
  readonly selectedPredictor = computed(() => this.selections().predictor);
  readonly selectedFacilityAnalysis = computed(() => this.selections().facilityAnalysis);
  readonly selectedAccountAnalysis = computed(() => this.selections().accountAnalysis);
  readonly selectedAccountReport = computed(() => this.selections().accountReport);
  readonly selectedFacilityReport = computed(() => this.selections().facilityReport);
  readonly selectedEnergyUseGroup = computed(() => this.selections().energyUseGroup);
  readonly selectedEnergyUseEquipment = computed(() => this.selections().energyUseEquipment);
  readonly revision = computed(() => this.state().revision);
  readonly committedRevision = computed(() => this.state().committedRevision);
  readonly error = computed(() => this.state().error);
  readonly isReady = computed(() => this.status() === 'ready');
  readonly isSwitching = computed(() => this.status() === 'switching');
  readonly canWrite = computed(() => this.isReady());

  readonly facilityMeters = computed(() => this.forSelectedFacility(this.meters()));
  readonly facilityMeterData = computed(() => this.forSelectedFacility(this.meterData()));
  readonly facilityMeterGroups = computed(() => this.forSelectedFacility(this.meterGroups()));
  readonly facilityPredictors = computed(() => this.forSelectedFacility(this.predictors()));
  readonly facilityPredictorData = computed(() => this.forSelectedFacility(this.predictorData()));
  readonly selectedFacilityAnalyses = computed(() => this.forSelectedFacility(this.facilityAnalyses()));
  readonly selectedFacilityReports = computed(() => this.forSelectedFacility(this.facilityReports()));
  readonly facilityEnergyUseGroups = computed(() => this.forSelectedFacility(this.energyUseGroups()));
  readonly facilityEnergyUseEquipment = computed(() => this.forSelectedFacility(this.energyUseEquipment()));

  readonly pendingOperations = computed(() => this.state().pendingOperations);
  readonly hasPending = computed(() => this.state().pendingOperations.length > 0);

  isPending(id: number): boolean {
    return this.state().pendingOperations.some(op => op.id === id);
  }

  setPending(op: PendingOperation): void {
    this.writableState.update(state => ({
      ...state,
      pendingOperations: [...state.pendingOperations, op]
    }));
  }

  clearPending(id: number): void {
    this.writableState.update(state => ({
      ...state,
      pendingOperations: state.pendingOperations.filter(op => op.id !== id)
    }));
  }

  beginLoad(switching: boolean): AccountWorkspaceState {
    const previous = this.state();
    this.writableState.set({
      ...previous,
      status: switching ? 'switching' : 'loading',
      error: undefined
    });
    return previous;
  }

  publish(snapshot: AccountWorkspaceSnapshot, selections: WorkspaceSelections = {}): void {
    const normalizedSnapshot = copySnapshot(snapshot);
    this.writableState.set({
      status: 'ready',
      snapshot: normalizedSnapshot,
      selections: validateSelections(normalizedSnapshot, selections),
      revision: 0,
      committedRevision: undefined,
      error: undefined,
      pendingOperations: []
    });
  }

  publishCommitted(snapshot: AccountWorkspaceSnapshot, selections: WorkspaceSelections): void {
    const normalizedSnapshot = copySnapshot(snapshot);
    const nextRevision = this.state().revision + 1;
    this.writableState.set({
      status: 'ready',
      snapshot: normalizedSnapshot,
      selections: validateSelections(normalizedSnapshot, selections),
      revision: nextRevision,
      committedRevision: {
        accountGuid: normalizedSnapshot.account.guid,
        revision: nextRevision
      },
      error: undefined,
      pendingOperations: this.state().pendingOperations
    });
  }

  publishCommittedPatch(patch: WorkspacePatch, selections: WorkspaceSelections = this.selections()): void {
    const snapshot = this.snapshot();
    if (!snapshot) {
      throw new WorkspaceSelectionError('A workspace must be loaded before publishing a patch.');
    }

    const patchedSnapshot = applyWorkspacePatch(snapshot, copyWorkspacePatch(patch));
    const nextRevision = this.state().revision + 1;
    this.writableState.set({
      status: 'ready',
      snapshot: patchedSnapshot,
      selections: preservePatchSelections(patchedSnapshot, selections),
      revision: nextRevision,
      committedRevision: {
        accountGuid: patchedSnapshot.account.guid,
        revision: nextRevision
      },
      error: undefined,
      pendingOperations: this.state().pendingOperations
    });
  }

  restore(previous: AccountWorkspaceState, error: WorkspaceError): void {
    if (previous.status === 'ready' && previous.snapshot) {
      this.writableState.set({ ...previous, error });
      return;
    }
    this.fail(error);
  }

  fail(error: WorkspaceError): void {
    this.writableState.set({
      status: 'error',
      selections: {},
      revision: 0,
      error,
      pendingOperations: []
    });
  }

  clear(): void {
    this.writableState.set(INITIAL_WORKSPACE_STATE);
  }

  setSelections(selections: WorkspaceSelections): void {
    const snapshot = this.snapshot();
    if (!snapshot) {
      if (Object.values(selections).some(Boolean)) {
        throw new WorkspaceSelectionError('A workspace must be loaded before selecting an entity.');
      }
      this.writableState.update(state => ({ ...state, selections: {} }));
      return;
    }
    this.writableState.update(state => ({
      ...state,
      selections: validateSelections(snapshot, selections)
    }));
  }

  selectFacility(facility?: IdbFacility): void {
    const snapshot = this.snapshot();
    if (!snapshot) {
      throw new WorkspaceSelectionError('A workspace must be loaded before selecting a facility.');
    }
    if (facility && !snapshot.facilities.some(item => item.guid === facility.guid)) {
      throw new WorkspaceSelectionError('The requested facility does not belong to the active account.');
    }
    const current = this.selections();
    this.setSelections({
      accountAnalysis: current.accountAnalysis,
      accountReport: current.accountReport,
      facility
    });
  }

  private forSelectedFacility<T extends { facilityId?: string }>(items: readonly T[]): readonly T[] {
    const facilityGuid = this.selectedFacility()?.guid;
    return facilityGuid ? items.filter(item => item.facilityId === facilityGuid) : [];
  }
}

function copySnapshot(snapshot: AccountWorkspaceSnapshot): AccountWorkspaceSnapshot {
  return {
    account: snapshot.account,
    facilities: [...snapshot.facilities],
    meters: [...snapshot.meters],
    meterData: [...snapshot.meterData],
    meterGroups: [...snapshot.meterGroups],
    predictors: [...snapshot.predictors],
    predictorData: [...snapshot.predictorData],
    facilityAnalyses: [...snapshot.facilityAnalyses],
    accountAnalyses: [...snapshot.accountAnalyses],
    accountReports: [...snapshot.accountReports],
    facilityReports: [...snapshot.facilityReports],
    customEmissions: [...snapshot.customEmissions],
    customFuels: [...snapshot.customFuels],
    customGWPs: [...snapshot.customGWPs],
    energyUseGroups: [...snapshot.energyUseGroups],
    energyUseEquipment: [...snapshot.energyUseEquipment]
  };
}

function applyWorkspacePatch(snapshot: AccountWorkspaceSnapshot, patch: WorkspacePatch): AccountWorkspaceSnapshot {
  const account = patch.account ?? snapshot.account;
  if (account.guid !== snapshot.account.guid) {
    throw new WorkspaceSelectionError('A workspace patch cannot replace the active account.');
  }

  const next = copySnapshot({
    ...snapshot,
    account
  });
  for (const collectionPatch of patch.collections ?? []) {
    const records = collectionPatch.upsert ?? [];
    validatePatchOwnership(account.guid, collectionPatch.collection, records);
    (next as any)[collectionPatch.collection] = applyCollectionPatch(
      (next as any)[collectionPatch.collection],
      records,
      collectionPatch.deleteIds,
      collectionPatch.deleteGuids
    );
  }
  return next;
}

function copyWorkspacePatch(patch: WorkspacePatch): WorkspacePatch {
  return {
    account: patch.account ? structuredClone(patch.account) : undefined,
    collections: patch.collections?.map(collectionPatch => ({
      collection: collectionPatch.collection,
      upsert: collectionPatch.upsert?.map(record => structuredClone(record)),
      deleteIds: collectionPatch.deleteIds ? [...collectionPatch.deleteIds] : undefined,
      deleteGuids: collectionPatch.deleteGuids ? [...collectionPatch.deleteGuids] : undefined
    }))
  };
}

function applyCollectionPatch<T extends { id?: number; guid?: string }>(
  current: readonly T[],
  upsert: readonly T[] = [],
  deleteIds: readonly number[] = [],
  deleteGuids: readonly string[] = []
): readonly T[] {
  const idsToDelete = new Set(deleteIds);
  const guidsToDelete = new Set(deleteGuids);
  let next = current.filter(item => {
    return (item.id === undefined || !idsToDelete.has(item.id))
      && (item.guid === undefined || !guidsToDelete.has(item.guid));
  });

  for (const record of upsert) {
    const index = next.findIndex(item => {
      if (record.id !== undefined && item.id === record.id) {
        return true;
      }
      return record.guid !== undefined && item.guid === record.guid;
    });
    if (index === -1) {
      next = [...next, record];
    } else {
      next = [
        ...next.slice(0, index),
        record,
        ...next.slice(index + 1)
      ];
    }
  }

  return sortByLocalId(next);
}

function validatePatchOwnership(
  accountGuid: string,
  collection: AccountWorkspaceCollectionKey,
  records: readonly { accountId?: string }[]
): void {
  if (records.some(record => record.accountId !== undefined && record.accountId !== accountGuid)) {
    throw new WorkspaceSelectionError(`The ${collection} patch contains data belonging to another account.`);
  }
}

function sortByLocalId<T extends { id?: number; guid?: string }>(items: readonly T[]): readonly T[] {
  return [...items].sort((first, second) => {
    const idResult = (first.id ?? Number.MAX_SAFE_INTEGER) - (second.id ?? Number.MAX_SAFE_INTEGER);
    return idResult || (first.guid ?? '').localeCompare(second.guid ?? '');
  });
}

function validateSelections(
  snapshot: AccountWorkspaceSnapshot,
  selections: WorkspaceSelections
): WorkspaceSelections {
  const facility = findSelection(snapshot.facilities, selections.facility, 'facility');
  const facilityGuid = facility?.guid;
  return {
    facility,
    meter: findFacilitySelection(snapshot.meters, selections.meter, facilityGuid, 'meter'),
    predictor: findFacilitySelection(snapshot.predictors, selections.predictor, facilityGuid, 'predictor'),
    facilityAnalysis: findFacilitySelection(
      snapshot.facilityAnalyses,
      selections.facilityAnalysis,
      facilityGuid,
      'facility analysis'
    ),
    accountAnalysis: findSelection(snapshot.accountAnalyses, selections.accountAnalysis, 'account analysis'),
    accountReport: findSelection(snapshot.accountReports, selections.accountReport, 'account report'),
    facilityReport: findFacilitySelection(
      snapshot.facilityReports,
      selections.facilityReport,
      facilityGuid,
      'facility report'
    ),
    energyUseGroup: findFacilitySelection(
      snapshot.energyUseGroups,
      selections.energyUseGroup,
      facilityGuid,
      'energy-use group'
    ),
    energyUseEquipment: findFacilitySelection(
      snapshot.energyUseEquipment,
      selections.energyUseEquipment,
      facilityGuid,
      'energy-use equipment'
    )
  };
}

function preservePatchSelections(
  snapshot: AccountWorkspaceSnapshot,
  selections: WorkspaceSelections
): WorkspaceSelections {
  const facility = findSelectionByGuid(snapshot.facilities, selections.facility);
  const facilityGuid = facility?.guid;
  return {
    facility,
    meter: findFacilitySelectionByGuid(snapshot.meters, selections.meter, facilityGuid),
    predictor: findFacilitySelectionByGuid(snapshot.predictors, selections.predictor, facilityGuid),
    facilityAnalysis: findFacilitySelectionByGuid(
      snapshot.facilityAnalyses,
      selections.facilityAnalysis,
      facilityGuid
    ),
    accountAnalysis: findSelectionByGuid(snapshot.accountAnalyses, selections.accountAnalysis),
    accountReport: findSelectionByGuid(snapshot.accountReports, selections.accountReport),
    facilityReport: findFacilitySelectionByGuid(snapshot.facilityReports, selections.facilityReport, facilityGuid),
    energyUseGroup: findFacilitySelectionByGuid(snapshot.energyUseGroups, selections.energyUseGroup, facilityGuid),
    energyUseEquipment: findFacilitySelectionByGuid(
      snapshot.energyUseEquipment,
      selections.energyUseEquipment,
      facilityGuid
    )
  };
}

function findSelectionByGuid<T extends { guid?: string }>(
  items: readonly T[],
  selected: T | undefined
): T | undefined {
  return selected ? items.find(item => item.guid === selected.guid) : undefined;
}

function findFacilitySelectionByGuid<T extends { guid?: string; facilityId?: string }>(
  items: readonly T[],
  selected: T | undefined,
  facilityGuid: string | undefined
): T | undefined {
  if (!selected || !facilityGuid) {
    return undefined;
  }
  return items.find(item => item.guid === selected.guid && item.facilityId === facilityGuid);
}

function findSelection<T extends { guid?: string }>(
  items: readonly T[],
  selected: T | undefined,
  label: string
): T | undefined {
  if (!selected) { return undefined; }
  const match = items.find(item => item.guid === selected.guid);
  if (!match) {
    throw new WorkspaceSelectionError(`The selected ${label} is not part of the active workspace.`);
  }
  return match;
}

function findFacilitySelection<T extends { guid?: string; facilityId?: string }>(
  items: readonly T[],
  selected: T | undefined,
  facilityGuid: string | undefined,
  label: string
): T | undefined {
  const match = findSelection(items, selected, label);
  if (match && match.facilityId !== facilityGuid) {
    throw new WorkspaceSelectionError(`The selected ${label} does not belong to the selected facility.`);
  }
  return match;
}
