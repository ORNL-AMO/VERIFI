import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { FacilityReportType, IdbFacilityReport } from '@data/models/idbModels/facilityReport';
import { IdbFacility } from '@data/models/idbModels/facility';
import { ReportType } from '@data/models/constantsAndTypes';
import { accountReportAnalysisSetupKey, accountReportAnalysisIsEligible } from './account-report-setup.models';

export type AnalysisUsageSource = { readonly accountGuid: string; readonly analysisGuid: string } & (
  | { readonly scope: 'account' }
  | { readonly scope: 'facility'; readonly facilityGuid: string }
);
export interface AnalysisUsageTarget { readonly kind: 'new'; readonly guid: string; readonly name: string; }
export type AnalysisUsageReport =
  | { readonly scope: 'account'; readonly type: ReportType }
  | { readonly scope: 'facility'; readonly type: FacilityReportType; readonly facilityGuid: string };
export interface AnalysisUsageCommand {
  readonly source: AnalysisUsageSource;
  readonly expectedSource: string;
  readonly target: AnalysisUsageTarget;
}
export interface AnalysisReportUsageCommand extends AnalysisUsageCommand { readonly report: AnalysisUsageReport; }

/** Compatibility for assigning a facility analysis to an account analysis. */
export function facilityAnalysisEligible(analysis: IdbAnalysisItem,
  accountAnalysis: Pick<IdbAccountAnalysisItem, 'analysisCategory' | 'energyIsSource' | 'baselineYear'>,
  facility: Pick<IdbFacility, 'guid' | 'isNewFacility'>): boolean {
  return analysis.facilityId === facility.guid && analysis.analysisCategory === accountAnalysis.analysisCategory
    && (analysis.analysisCategory !== 'energy' || analysis.energyIsSource === accountAnalysis.energyIsSource)
    && (!!facility.isNewFacility || analysis.baselineYear === accountAnalysis.baselineYear);
}

export function analysisUsageSourceKey(analysis: IdbAnalysisItem | IdbAccountAnalysisItem): string {
  return JSON.stringify([analysis.guid, analysis.analysisCategory, analysis.energyIsSource, analysis.baselineYear]);
}

export function facilityReportAnalysisGuid(report: IdbFacilityReport): string | undefined {
  return report.facilityReportType === 'dataQuality'
    ? report.dataQualityReportSettings?.selectedMode === 'analysis' ? report.dataQualityReportSettings.selectedAnalysisItemId : undefined
    : report.analysisItemId;
}

export function analysisReportCompatible(scope: 'account' | 'facility', type: string,
  analysis: Pick<IdbAnalysisItem, 'analysisCategory' | 'energyIsSource'>): boolean {
  if (!['energy', 'water'].includes(analysis.analysisCategory)) return false;
  if (scope === 'account') return !!accountReportAnalysisSetupKey(type as ReportType) && accountReportAnalysisIsEligible(analysis);
  return ['analysis', 'savings', 'modeling', 'dataQuality'].includes(type)
    || type === 'costSavings' && (analysis.analysisCategory === 'water' || !analysis.energyIsSource);
}
