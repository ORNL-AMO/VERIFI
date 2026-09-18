import { CalanderizedMeter } from '@data/models/calanderization';

export type WorkspaceCalendarizationState = 'idle' | 'evaluating' | 'ready' | 'error';

export interface WorkspaceCalendarizationError {
  readonly code: 'invalid-projection' | 'calculation-failed';
  readonly message: string;
}

/** One account-wide, site-energy calculation in stable canonical units. */
export interface WorkspaceCalendarizationBaseResult {
  readonly state: WorkspaceCalendarizationState;
  readonly accountGuid?: string;
  readonly inputFingerprint?: string;
  readonly meters: readonly CalanderizedMeter[];
  readonly error?: WorkspaceCalendarizationError;
}

export type WorkspaceCalendarizationProjectionContext =
  | { readonly kind: 'account'; readonly guid: string }
  | { readonly kind: 'facility'; readonly guid: string };

export interface WorkspaceCalendarizationProjectionRequest {
  readonly context: WorkspaceCalendarizationProjectionContext;
  readonly meterGuids?: readonly string[];
  readonly energyUnit?: string;
  readonly waterUnit?: string;
  readonly energyIsSource?: boolean;
  readonly includeEmissions: boolean;
}

export interface ResolvedWorkspaceCalendarizationProjection {
  readonly context: WorkspaceCalendarizationProjectionContext;
  readonly meterGuids: readonly string[];
  readonly energyUnit: string;
  readonly waterUnit: string;
  readonly energyIsSource: boolean;
  readonly includeEmissions: boolean;
  readonly fiscalYear: 'calendarYear' | 'nonCalendarYear';
  readonly fiscalYearMonth: number;
  readonly fiscalYearCalendarEnd: boolean;
}

export interface WorkspaceCalendarizationProjectionResult {
  readonly state: 'ready' | 'error';
  readonly accountGuid: string;
  readonly inputFingerprint: string;
  readonly projection?: ResolvedWorkspaceCalendarizationProjection;
  readonly meters: readonly CalanderizedMeter[];
  readonly error?: WorkspaceCalendarizationError;
}

export const IDLE_WORKSPACE_CALENDARIZATION: WorkspaceCalendarizationBaseResult = {
  state: 'idle',
  meters: []
};
