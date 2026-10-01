/**
 * Types for the workspace command boundary: typed results, committed-change events,
 * write errors, and pending-operation tracking.
 *
 * These types are the public contract between feature code and the write boundary.
 * Features only observe and submit; they never write to repositories directly.
 */

// ---------------------------------------------------------------------------
// Entity and change-kind unions
// ---------------------------------------------------------------------------

export type WorkspaceEntityKind =
  | 'account'
  | 'facility'
  | 'meter'
  | 'meterData'
  | 'meterGroup'
  | 'predictor'
  | 'predictorData'
  | 'facilityAnalysis'
  | 'accountAnalysis'
  | 'facilityReport'
  | 'accountReport'
  | 'customEmissions'
  | 'customFuel'
  | 'customGWP'
  | 'energyUseGroup'
  | 'energyUseEquipment';

export type WorkspaceChangeKind = 'add' | 'update' | 'delete' | 'bulk';

// ---------------------------------------------------------------------------
// Committed-change event
// ---------------------------------------------------------------------------

export interface WorkspaceCommittedChange {
  readonly entityKind: WorkspaceEntityKind;
  readonly changeKind: WorkspaceChangeKind;
  /** GUID of the affected entity, or the account GUID for bulk/account-level changes. */
  readonly entityGuid?: string;
  readonly accountGuid: string;
}

// ---------------------------------------------------------------------------
// Command results
// ---------------------------------------------------------------------------

export interface WorkspaceCommandResult<T> {
  readonly value: T;
  readonly change: WorkspaceCommittedChange;
}

// ---------------------------------------------------------------------------
// Write errors
// ---------------------------------------------------------------------------

export type WorkspaceWriteErrorCode =
  | 'workspace-not-ready'
  | 'stale-workspace'
  | 'cross-account-entity'
  | 'validation-failed'
  | 'persistence-failed'
  | 'transaction-failed';

export class WorkspaceWriteError extends Error {
  readonly code: WorkspaceWriteErrorCode;
  readonly cause?: unknown;

  constructor(code: WorkspaceWriteErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'WorkspaceWriteError';
    this.code = code;
    this.cause = cause;
  }
}

// ---------------------------------------------------------------------------
// Pending operations
// ---------------------------------------------------------------------------

export interface WorkspacePendingOperation {
  /** Unique operation ID (monotonically increasing within the session). */
  readonly id: number;
  readonly entityKind: WorkspaceEntityKind;
  readonly changeKind: WorkspaceChangeKind;
}
