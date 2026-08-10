/**
 * Single entry point for all durable workspace writes.
 *
 * Components and feature services submit typed commands here.
 * The boundary guards the workspace state, tracks pending operations,
 * executes persistence (delegated to a caller-supplied function),
 * reloads the workspace on success, and emits one committed-change event
 * per completed user operation.
 *
 * Commands are queued per active account so multi-step operations execute
 * in submission order and a stale write cannot publish after an account switch.
 */
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { AccountWorkspaceService } from './account-workspace.service';
import { AccountWorkspaceStore } from './account-workspace.store';
import { deleteWorkspaceRecords, upsertWorkspaceRecords } from './account-workspace-patches';
import {
  AccountWorkspaceCollectionKey,
  WorkspacePatch,
  WorkspacePatchRecord
} from './account-workspace.models';
import {
  WorkspaceChangeKind,
  WorkspaceCommittedChange,
  WorkspaceCommandResult,
  WorkspaceEntityKind,
  WorkspaceWriteError
} from './workspace-commands.models';

let nextOperationId = 0;

const ENTITY_COLLECTIONS: Partial<Record<WorkspaceEntityKind, AccountWorkspaceCollectionKey>> = {
  facility: 'facilities',
  meter: 'meters',
  meterData: 'meterData',
  meterGroup: 'meterGroups',
  predictor: 'predictors',
  predictorData: 'predictorData',
  facilityAnalysis: 'facilityAnalyses',
  accountAnalysis: 'accountAnalyses',
  facilityReport: 'facilityReports',
  accountReport: 'accountReports',
  customEmissions: 'customEmissions',
  customFuel: 'customFuels',
  customGWP: 'customGWPs',
  energyUseGroup: 'energyUseGroups',
  energyUseEquipment: 'energyUseEquipment'
};

export interface WorkspaceCommandOptions {
  readonly entityKind: WorkspaceEntityKind;
  readonly changeKind: WorkspaceChangeKind;
  readonly entityGuid?: string;
  /** Human-readable label shown while the operation is in-flight. */
  readonly label: string;
}

export type WorkspacePublication<T> =
  | { readonly mode?: 'reload' }
  | {
    readonly mode: 'patch';
    readonly buildPatch: (value: T) => WorkspacePatch;
  };

export type WorkspaceCommandRequest<T> = WorkspaceCommandOptions & {
  readonly publication?: WorkspacePublication<T>;
};

@Injectable({ providedIn: 'root' })
export class WorkspaceCommandBoundary {
  private readonly committedChangeSubject = new Subject<WorkspaceCommittedChange>();
  /** Emits once per successfully committed user operation. */
  readonly committedChange$ = this.committedChangeSubject.asObservable();

  /** Active account-scoped command queue. Resets when the active account changes. */
  private queueAccountGuid: string | undefined;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly store: AccountWorkspaceStore,
    private readonly workspaceService: AccountWorkspaceService
  ) { }

  /**
   * Execute a workspace write command through the boundary.
   *
   * @param options - Entity kind, change kind, entity GUID, and label for pending state.
   * @param persist - Async function that performs the IndexedDB writes. Called only after
   *   guards pass. Must not modify workspace state or reload the workspace itself.
   * @returns A resolved result containing the persisted value and the committed-change descriptor.
   * @throws WorkspaceWriteError when the workspace is not ready, the account is stale, or
   *   persistence fails.
   */
  execute<T>(
    options: WorkspaceCommandRequest<T>,
    persist: () => Promise<T>
  ): Promise<WorkspaceCommandResult<T>> {
    let accountGuid: string;
    try {
      accountGuid = this.guardReady();
    } catch (error) {
      return Promise.reject(error);
    }
    return this.enqueue(accountGuid, () => this.run(accountGuid, options, persist));
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private guardReady(): string {
    if (!this.store.isReady()) {
      throw new WorkspaceWriteError(
        'workspace-not-ready',
        'The workspace must be ready before submitting a command.'
      );
    }
    const accountGuid = this.store.account()?.guid;
    if (!accountGuid) {
      throw new WorkspaceWriteError(
        'workspace-not-ready',
        'The workspace has no active account.'
      );
    }
    return accountGuid;
  }

  private enqueue<T>(accountGuid: string, fn: () => Promise<T>): Promise<T> {
    if (this.queueAccountGuid !== accountGuid) {
      this.queueAccountGuid = accountGuid;
      this.queue = Promise.resolve();
    }
    const next = this.queue.then(fn, fn);
    this.queue = next.then(() => undefined, () => undefined);
    return next;
  }

  private async run<T>(
    submittedAccountGuid: string,
    options: WorkspaceCommandRequest<T>,
    persist: () => Promise<T>
  ): Promise<WorkspaceCommandResult<T>> {
    this.assertCommandStillCurrent(submittedAccountGuid, 'before execution');

    const opId = ++nextOperationId;
    this.store.setPending({ id: opId, label: options.label });

    let value: T;
    try {
      value = await persist();
    } catch (error) {
      this.store.clearPending(opId);
      if (error instanceof WorkspaceWriteError) { throw error; }
      throw new WorkspaceWriteError(
        'persistence-failed',
        `Persistence failed for ${options.entityKind} ${options.changeKind}.`,
        error
      );
    }

    try {
      this.assertCommandStillCurrent(submittedAccountGuid, 'after persistence');
    } catch (error) {
      this.store.clearPending(opId);
      throw error;
    }

    const reloadResult = await this.publishCommittedWorkspace(opId, options, value);

    if (reloadResult !== 'published') {
      this.store.clearPending(opId);
      throw new WorkspaceWriteError(
        'stale-workspace',
        `Command for account ${submittedAccountGuid} was superseded before the committed workspace reload could publish.`
      );
    }

    try {
      this.assertCommandStillCurrent(submittedAccountGuid, 'after reload');
    } catch (error) {
      this.store.clearPending(opId);
      throw error;
    }

    this.store.clearPending(opId);

    const change: WorkspaceCommittedChange = {
      entityKind: options.entityKind,
      changeKind: options.changeKind,
      entityGuid: options.entityGuid,
      accountGuid: submittedAccountGuid
    };
    this.committedChangeSubject.next(change);

    return { value, change };
  }

  private async reloadCommittedWorkspace(
    opId: number,
    options: WorkspaceCommandOptions
  ) {
    try {
      return await this.workspaceService.reloadActiveWorkspace(true);
    } catch (error) {
      this.store.clearPending(opId);
      throw new WorkspaceWriteError(
        'persistence-failed',
        `Workspace reload failed after ${options.entityKind} ${options.changeKind}.`,
        error
      );
    }
  }

  private async publishCommittedWorkspace<T>(
    opId: number,
    options: WorkspaceCommandRequest<T>,
    value: T
  ) {
    const explicitPublication = options.publication;
    if (explicitPublication?.mode === 'reload') {
      return this.reloadCommittedWorkspace(opId, options);
    }

    if (explicitPublication?.mode === 'patch') {
      try {
        this.store.publishCommittedPatch(explicitPublication.buildPatch(value));
        return 'published' as const;
      } catch {
        return this.reloadCommittedWorkspace(opId, options);
      }
    }

    const patch = this.buildDefaultPatch(options, value);
    if (patch) {
      try {
        this.store.publishCommittedPatch(patch);
        return 'published' as const;
      } catch {
        return this.reloadCommittedWorkspace(opId, options);
      }
    }

    // Reload the workspace. If this fails, the persistence already committed —
    // re-throw so the caller can report a partial failure.
    return this.reloadCommittedWorkspace(opId, options);
  }

  private buildDefaultPatch<T>(
    options: WorkspaceCommandOptions,
    value: T
  ): WorkspacePatch | undefined {
    if (options.changeKind === 'bulk') {
      return undefined;
    }

    if (options.entityKind === 'account') {
      return this.buildDefaultAccountPatch(options.changeKind, value);
    }

    const collection = ENTITY_COLLECTIONS[options.entityKind];
    if (!collection) {
      return undefined;
    }

    if (options.changeKind === 'add' || options.changeKind === 'update') {
      return isWorkspacePatchRecord(value)
        ? upsertWorkspaceRecords(collection, [value as never])
        : undefined;
    }

    if (options.changeKind === 'delete') {
      if (options.entityKind === 'facility') {
        return undefined;
      }
      return typeof value === 'number'
        ? deleteWorkspaceRecords(collection, { ids: [value] })
        : undefined;
    }

    return undefined;
  }

  private buildDefaultAccountPatch<T>(
    changeKind: WorkspaceChangeKind,
    value: T
  ): WorkspacePatch | undefined {
    if (changeKind !== 'add' && changeKind !== 'update') {
      return undefined;
    }
    return isWorkspacePatchRecord(value)
      ? { account: value as never }
      : undefined;
  }

  private assertCommandStillCurrent(submittedAccountGuid: string, phase: string): void {
    if (!this.store.isReady()) {
      throw new WorkspaceWriteError(
        'stale-workspace',
        `Command for account ${submittedAccountGuid} became stale ${phase} because the workspace is no longer ready.`
      );
    }

    const currentAccountGuid = this.store.account()?.guid;
    if (currentAccountGuid !== submittedAccountGuid) {
      throw new WorkspaceWriteError(
        'stale-workspace',
        `Command was submitted for account ${submittedAccountGuid} but the active account is now ${currentAccountGuid} ${phase}.`
      );
    }
  }
}

function isWorkspacePatchRecord(value: unknown): value is WorkspacePatchRecord {
  return typeof value === 'object'
    && value !== null
    && typeof (value as WorkspacePatchRecord).guid === 'string';
}
