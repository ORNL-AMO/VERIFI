/**
 * Orchestrates latest-request-wins account loading, validated entity selection, selection hints,
 * and hydration or committed workspace refreshes.
 */
import { Injectable } from '@angular/core';
import { AccountWorkspaceLoaderService, AccountWorkspaceLoadError } from './account-workspace-loader.service';
import { AccountWorkspaceSnapshot, WorkspaceLoadResult, WorkspaceSelections, WorkspaceSelectionError } from './account-workspace.models';
import { AccountWorkspaceStore } from './account-workspace.store';
import { WorkspaceSelectionHints, WorkspaceSelectionStorageService } from './workspace-selection-storage.service';

@Injectable({ providedIn: 'root' })
export class AccountWorkspaceService {
  private latestRequestToken = 0;

  constructor(
    private loader: AccountWorkspaceLoaderService,
    private store: AccountWorkspaceStore,
    private selectionStorage: WorkspaceSelectionStorageService
  ) { }

  async selectAccount(accountGuid: string): Promise<WorkspaceLoadResult> {
    const token = ++this.latestRequestToken;
    const switching = this.store.isReady() && this.store.account()?.guid !== accountGuid;
    const previous = this.store.beginLoad(switching);

    try {
      const snapshot = await this.loader.load(accountGuid);
      if (token !== this.latestRequestToken) { return 'superseded'; }

      const selections = restoreSelections(snapshot, this.selectionStorage.read());
      this.store.publish(snapshot, selections);
      this.syncPersistedHints(snapshot, selections);
      return 'published';
    } catch (error) {
      if (token !== this.latestRequestToken) { return 'superseded'; }
      const workspaceError = error instanceof AccountWorkspaceLoadError
        ? error.workspaceError
        : {
          code: 'load-failed' as const,
          accountGuid,
          message: 'The account workspace could not be loaded.',
          cause: error
        };
      this.store.restore(previous, workspaceError);
      throw error;
    }
  }

  async reloadActiveWorkspace(committed = false): Promise<WorkspaceLoadResult> {
    const accountGuid = this.store.account()?.guid;
    if (!accountGuid) {
      throw new AccountWorkspaceLoadError({
        code: 'account-not-found',
        message: 'There is no active account to reload.'
      });
    }

    const token = ++this.latestRequestToken;
    const previous = this.store.beginLoad(false);
    try {
      const snapshot = await this.loader.load(accountGuid);
      if (token !== this.latestRequestToken) { return 'superseded'; }
      const selections = preserveSelections(snapshot, previous.selections);
      if (committed) {
        this.store.publishCommitted(snapshot, selections);
      } else {
        this.store.publish(snapshot, selections);
      }
      this.syncPersistedHints(snapshot, selections);
      return 'published';
    } catch (error) {
      if (token !== this.latestRequestToken) { return 'superseded'; }
      const workspaceError = error instanceof AccountWorkspaceLoadError
        ? error.workspaceError
        : {
          code: 'load-failed' as const,
          accountGuid,
          message: 'The account workspace could not be reloaded.',
          cause: error
        };
      this.store.restore(previous, workspaceError);
      throw error;
    }
  }

  selectFacility(facilityGuid?: string): void {
    if (!facilityGuid) {
      this.store.selectFacility(undefined);
      this.syncPersistedSelectionHints(this.store.selections());
      return;
    }
    const facility = this.store.facilities().find(item => item.guid === facilityGuid);
    if (!facility) {
      throw new WorkspaceSelectionError('The requested facility does not belong to the active account.');
    }
    this.store.selectFacility(facility);
    this.syncPersistedSelectionHints(this.store.selections());
  }

  selectMeter(meterGuid?: string): void {
    this.selectFacilityEntity('meter', this.store.meters(), meterGuid, 'meter');
  }

  selectPredictor(predictorGuid?: string): void {
    this.selectFacilityEntity('predictor', this.store.predictors(), predictorGuid, 'predictor');
  }

  selectFacilityAnalysis(analysisGuid?: string): void {
    this.selectFacilityEntity(
      'facilityAnalysis',
      this.store.facilityAnalyses(),
      analysisGuid,
      'facility analysis'
    );
    this.syncPersistedSelectionHints(this.store.selections());
  }

  selectAccountAnalysis(analysisGuid?: string): void {
    this.selectAccountEntity('accountAnalysis', this.store.accountAnalyses(), analysisGuid, 'account analysis');
    this.syncPersistedSelectionHints(this.store.selections());
  }

  selectAccountReport(reportGuid?: string): void {
    this.selectAccountEntity('accountReport', this.store.accountReports(), reportGuid, 'account report');
    this.syncPersistedSelectionHints(this.store.selections());
  }

  selectFacilityReport(reportGuid?: string): void {
    this.selectFacilityEntity('facilityReport', this.store.facilityReports(), reportGuid, 'facility report');
    this.syncPersistedSelectionHints(this.store.selections());
  }

  selectEnergyUseGroup(groupGuid?: string): void {
    this.selectFacilityEntity('energyUseGroup', this.store.energyUseGroups(), groupGuid, 'energy-use group');
  }

  selectEnergyUseEquipment(equipmentGuid?: string): void {
    this.selectFacilityEntity(
      'energyUseEquipment',
      this.store.energyUseEquipment(),
      equipmentGuid,
      'energy-use equipment'
    );
  }

  clear(): void {
    ++this.latestRequestToken;
    this.store.clear();
    this.selectionStorage.clearAccount();
    this.selectionStorage.clearFacility();
    this.selectionStorage.clearFacilityAnalysis();
    this.selectionStorage.clearAccountAnalysis();
    this.selectionStorage.clearAccountReport();
    this.selectionStorage.clearFacilityReport();
  }

  private selectFacilityEntity<K extends keyof WorkspaceSelections, T extends { guid?: string; facilityId?: string }>(
    key: K,
    items: readonly T[],
    guid: string | undefined,
    label: string
  ): void {
    const selected = guid === undefined ? undefined : items.find(item => item.guid === guid);
    const facilityGuid = this.store.selectedFacility()?.guid;
    if (guid !== undefined && (!selected || !facilityGuid || selected.facilityId !== facilityGuid)) {
      throw new WorkspaceSelectionError(`The requested ${label} does not belong to the active facility.`);
    }
    this.store.setSelections({ ...this.store.selections(), [key]: selected });
  }

  private selectAccountEntity<K extends keyof WorkspaceSelections, T extends { guid?: string }>(
    key: K,
    items: readonly T[],
    guid: string | undefined,
    label: string
  ): void {
    const selected = guid === undefined ? undefined : items.find(item => item.guid === guid);
    if (guid !== undefined && !selected) {
      throw new WorkspaceSelectionError(`The requested ${label} does not belong to the active account.`);
    }
    this.store.setSelections({ ...this.store.selections(), [key]: selected });
  }

  private syncPersistedHints(snapshot: AccountWorkspaceSnapshot, selections: WorkspaceSelections): void {
    if (snapshot.account.id !== undefined) {
      this.selectionStorage.storeAccount(snapshot.account.id);
    }
    this.syncPersistedSelectionHints(selections);
  }

  private syncPersistedSelectionHints(selections: WorkspaceSelections): void {
    if (selections.facility?.id !== undefined) {
      this.selectionStorage.storeFacility(selections.facility.id);
    } else {
      this.selectionStorage.clearFacility();
    }
    syncHint(selections.facilityAnalysis?.id, id => this.selectionStorage.storeFacilityAnalysis(id), () => {
      this.selectionStorage.clearFacilityAnalysis();
    });
    syncHint(selections.accountAnalysis?.id, id => this.selectionStorage.storeAccountAnalysis(id), () => {
      this.selectionStorage.clearAccountAnalysis();
    });
    syncHint(selections.accountReport?.id, id => this.selectionStorage.storeAccountReport(id), () => {
      this.selectionStorage.clearAccountReport();
    });
    syncHint(selections.facilityReport?.id, id => this.selectionStorage.storeFacilityReport(id), () => {
      this.selectionStorage.clearFacilityReport();
    });
  }
}

function syncHint(id: number | undefined, store: (id: number) => void, clear: () => void): void {
  if (id === undefined) {
    clear();
  } else {
    store(id);
  }
}

function restoreSelections(
  snapshot: AccountWorkspaceSnapshot,
  hints: WorkspaceSelectionHints
): WorkspaceSelections {
  const facility = findById(snapshot.facilities, hints.facilityId);
  return {
    facility,
    facilityAnalysis: findFacilityById(snapshot.facilityAnalyses, hints.facilityAnalysisId, facility?.guid),
    accountAnalysis: findById(snapshot.accountAnalyses, hints.accountAnalysisId),
    accountReport: findById(snapshot.accountReports, hints.accountReportId),
    facilityReport: findFacilityById(snapshot.facilityReports, hints.facilityReportId, facility?.guid)
  };
}

function preserveSelections(
  snapshot: AccountWorkspaceSnapshot,
  selections: WorkspaceSelections
): WorkspaceSelections {
  const facility = findByGuid(snapshot.facilities, selections.facility?.guid);
  return {
    facility,
    meter: findFacilityByGuid(snapshot.meters, selections.meter?.guid, facility?.guid),
    predictor: findFacilityByGuid(snapshot.predictors, selections.predictor?.guid, facility?.guid),
    facilityAnalysis: findFacilityByGuid(
      snapshot.facilityAnalyses,
      selections.facilityAnalysis?.guid,
      facility?.guid
    ),
    accountAnalysis: findByGuid(snapshot.accountAnalyses, selections.accountAnalysis?.guid),
    accountReport: findByGuid(snapshot.accountReports, selections.accountReport?.guid),
    facilityReport: findFacilityByGuid(snapshot.facilityReports, selections.facilityReport?.guid, facility?.guid),
    energyUseGroup: findFacilityByGuid(snapshot.energyUseGroups, selections.energyUseGroup?.guid, facility?.guid),
    energyUseEquipment: findFacilityByGuid(
      snapshot.energyUseEquipment,
      selections.energyUseEquipment?.guid,
      facility?.guid
    )
  };
}

function findById<T extends { id?: number }>(items: readonly T[], id?: number): T | undefined {
  return id === undefined ? undefined : items.find(item => item.id === id);
}

function findFacilityById<T extends { id?: number; facilityId?: string }>(
  items: readonly T[],
  id: number | undefined,
  facilityGuid: string | undefined
): T | undefined {
  const item = findById(items, id);
  return item?.facilityId === facilityGuid ? item : undefined;
}

function findByGuid<T extends { guid?: string }>(items: readonly T[], guid?: string): T | undefined {
  return guid === undefined ? undefined : items.find(item => item.guid === guid);
}

function findFacilityByGuid<T extends { guid?: string; facilityId?: string }>(
  items: readonly T[],
  guid: string | undefined,
  facilityGuid: string | undefined
): T | undefined {
  const item = findByGuid(items, guid);
  return item?.facilityId === facilityGuid ? item : undefined;
}
