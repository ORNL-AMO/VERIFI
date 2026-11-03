export type ReportScope = 'account' | 'facility';
export type ReportConfigurationStatus = 'ready' | 'warning' | 'error' | 'checking' | 'unavailable';
export type ReportIdentity =
  | { readonly scope: 'account'; readonly accountGuid: string; readonly reportGuid: string }
  | { readonly scope: 'facility'; readonly accountGuid: string; readonly facilityGuid: string; readonly reportGuid: string };
