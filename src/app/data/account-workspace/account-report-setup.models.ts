import { ReportType } from '@data/models/constantsAndTypes';
import { IdbAccountReport } from '@data/models/idbModels/accountReport';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';

export type ReportAnalysisSelection =
  | { readonly scope: 'account'; readonly analysisGuid: string }
  | { readonly scope: 'facility'; readonly facilityGuid: string; readonly analysisGuid: string };

/** Omitted fields are preserved; null explicitly clears the report's analysis link. */
export interface AccountReportSetupChanges {
  readonly name?: string;
  readonly analysis?: ReportAnalysisSelection | null;
}
export interface AccountReportSetupResult {
  readonly report: IdbAccountReport;
  /** Selected durable analyses to publish, including unchanged records reused from storage. */
  readonly accountAnalyses: readonly IdbAccountAnalysisItem[];
}
export function accountReportAnalysisIsEligible(analysis: Pick<IdbAccountAnalysisItem, 'analysisCategory' | 'energyIsSource'>): boolean {
  return analysis.analysisCategory === 'water' || analysis.energyIsSource;
}
export function accountReportAnalysisSetupKey(type: ReportType) {
  switch (type) {
    case 'betterPlants': return 'betterPlantsReportSetup';
    case 'performance': return 'performanceReportSetup';
    case 'analysis': return 'analysisReportSetup';
    case 'accountSavings': return 'accountSavingsReportSetup';
    default: return undefined;
  }
}
export function accountReportAnalysisGuid(report: IdbAccountReport): string | undefined {
  const key = accountReportAnalysisSetupKey(report.reportType);
  return key ? report[key]?.analysisItemId : undefined;
}
