export interface WorkspaceInventoryCounts {
  readonly facilities: number;
  readonly meters: number;
  readonly predictors: number;
  readonly analyses: number;
  readonly reports: number;
}

export type SingleSiteWorkspaceState = 'portfolio' | 'valid' | 'missing-facility' | 'multiple-facilities';
