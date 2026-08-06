export type AppStartupStatus = 'idle' | 'initializing' | 'ready' | 'empty' | 'error';

export type AppStartupStep =
  | 'database'
  | 'migrations'
  | 'application-metadata'
  | 'reference-data'
  | 'account-catalog'
  | 'account-selection'
  | 'workspace'
  | 'electron-metadata'
  | 'automatic-backups';

export interface AppStartupError {
  readonly step: AppStartupStep;
  readonly message: string;
  readonly retryable: boolean;
  readonly cause?: unknown;
}

export interface AppStartupState {
  readonly status: AppStartupStatus;
  readonly step?: AppStartupStep;
  readonly message?: string;
  readonly error?: AppStartupError;
}
