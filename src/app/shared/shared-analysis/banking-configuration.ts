import { AnalysisGroup } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';

export function getBankedAnalysisGroup(
  analysisItem: IdbAnalysisItem | undefined,
  group: AnalysisGroup | undefined,
  bankedAnalysisItem: IdbAnalysisItem | undefined
): AnalysisGroup | undefined {
  if (!analysisItem?.hasBanking
    || !analysisItem.bankedAnalysisItemId
    || bankedAnalysisItem?.guid !== analysisItem.bankedAnalysisItemId
    || !group) {
    return undefined;
  }

  return bankedAnalysisItem.groups?.find(item => item.idbGroupId === group.idbGroupId);
}

export function isBankedGroupConfigurationComplete(
  analysisItem: IdbAnalysisItem | undefined,
  group: AnalysisGroup | undefined,
  bankedAnalysisItem: IdbAnalysisItem | undefined
): boolean {
  const bankedGroup = getBankedAnalysisGroup(analysisItem, group, bankedAnalysisItem);
  return !!group?.applyBanking
    && !!bankedGroup
    && bankedGroup.analysisType !== 'skip'
    && bankedGroup.analysisType !== 'skipAnalysis'
    && Number.isFinite(group.bankedAnalysisYear)
    && Number.isFinite(group.newBaselineYear)
    && group.bankedAnalysisYear < group.newBaselineYear;
}
