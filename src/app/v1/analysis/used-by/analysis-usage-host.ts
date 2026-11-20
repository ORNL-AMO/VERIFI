import { InjectionToken, Signal } from '@angular/core';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';

export interface AnalysisUsageHost {
  readonly scope: 'account' | 'facility';
  readonly analysis: Signal<IdbAnalysisItem | IdbAccountAnalysisItem | undefined>;
  readonly blocked: Signal<boolean>;
  readonly flush: () => Promise<boolean>;
}
export const ANALYSIS_USAGE_HOST = new InjectionToken<AnalysisUsageHost>('Analysis Used By host');
