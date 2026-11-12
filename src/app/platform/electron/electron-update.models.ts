export interface ElectronUpdateState {
  readonly status: 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'installing' | 'current' | 'unsupported' | 'error';
  readonly version?: string;
  readonly releaseName?: string;
  readonly percent?: number;
  readonly operation?: 'check' | 'download';
  readonly message?: string;
}
