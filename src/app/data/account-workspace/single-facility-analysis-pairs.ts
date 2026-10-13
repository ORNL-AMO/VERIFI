import { IdbAccount } from '@data/models/idbModels/account';
import {
  getNewIdbAccountAnalysisItem,
  IdbAccountAnalysisItem
} from '@data/models/idbModels/accountAnalysisItem';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbFacility } from '@data/models/idbModels/facility';

export function isSingleFacilityAnalysisPair(
  accountAnalysis: Pick<IdbAccountAnalysisItem, 'facilityAnalysisItems'>,
  facilityGuid: string,
  facilityAnalysisGuid: string
): boolean {
  return accountAnalysis.facilityAnalysisItems?.length === 1
    && accountAnalysis.facilityAnalysisItems[0].facilityId === facilityGuid
    && accountAnalysis.facilityAnalysisItems[0].analysisItemId === facilityAnalysisGuid;
}

export function singleFacilityAnalysisPairCandidates(
  accountAnalyses: readonly IdbAccountAnalysisItem[],
  facilityGuid: string,
  facilityAnalysisGuid: string
): readonly IdbAccountAnalysisItem[] {
  return accountAnalyses
    .filter(item => isSingleFacilityAnalysisPair(item, facilityGuid, facilityAnalysisGuid))
    .sort((first, second) => (first.id ?? Number.MAX_SAFE_INTEGER) - (second.id ?? Number.MAX_SAFE_INTEGER)
      || first.guid.localeCompare(second.guid));
}

export function buildSingleFacilityAnalysisPair(
  account: IdbAccount,
  facility: IdbFacility,
  facilityAnalysis: IdbAnalysisItem,
  existing?: IdbAccountAnalysisItem
): IdbAccountAnalysisItem {
  const pair = existing
    ? structuredClone(existing)
    : getNewIdbAccountAnalysisItem(facilityAnalysis.analysisCategory, account, [facility]);
  return {
    ...pair,
    accountId: account.guid,
    name: facilityAnalysis.name,
    energyIsSource: facilityAnalysis.energyIsSource,
    energyUnit: facilityAnalysis.energyUnit,
    waterUnit: facilityAnalysis.waterUnit,
    baselineYear: facilityAnalysis.baselineYear,
    analysisCategory: facilityAnalysis.analysisCategory,
    facilityAnalysisItems: [{
      facilityId: facility.guid,
      analysisItemId: facilityAnalysis.guid
    }],
    facilityItemsInitialized: true,
    hasBanking: facilityAnalysis.hasBanking,
    isAnalysisVisited: false,
    modifiedDate: facilityAnalysis.modifiedDate ?? pair.modifiedDate
  };
}

export function singleFacilityAnalysisPairIsCurrent(
  accountAnalysis: IdbAccountAnalysisItem,
  facility: IdbFacility,
  facilityAnalysis: IdbAnalysisItem
): boolean {
  return accountAnalysis.accountId === facilityAnalysis.accountId
    && accountAnalysis.name === facilityAnalysis.name
    && accountAnalysis.energyIsSource === facilityAnalysis.energyIsSource
    && accountAnalysis.energyUnit === facilityAnalysis.energyUnit
    && accountAnalysis.waterUnit === facilityAnalysis.waterUnit
    && accountAnalysis.baselineYear === facilityAnalysis.baselineYear
    && accountAnalysis.analysisCategory === facilityAnalysis.analysisCategory
    && accountAnalysis.facilityItemsInitialized === true
    && accountAnalysis.hasBanking === facilityAnalysis.hasBanking
    && isSingleFacilityAnalysisPair(accountAnalysis, facility.guid, facilityAnalysis.guid);
}

export function singleFacilityAnalysisPairsNeedSync(
  account: IdbAccount,
  facility: IdbFacility,
  facilityAnalyses: readonly IdbAnalysisItem[],
  accountAnalyses: readonly IdbAccountAnalysisItem[]
): boolean {
  if (facilityAnalyses.some(analysis => {
    const candidates = singleFacilityAnalysisPairCandidates(accountAnalyses, facility.guid, analysis.guid);
    return !candidates.length || !candidates.some(pair => singleFacilityAnalysisPairIsCurrent(pair, facility, analysis));
  })) return true;
  const activePairMismatch = (
    accountAnalysisGuid: string | undefined,
    facilityAnalysisGuid: string | undefined,
    category: 'energy' | 'water'
  ) => {
    if (!facilityAnalysisGuid) return accountAnalysisGuid !== undefined;
    if (facilityAnalyses.find(item => item.guid === facilityAnalysisGuid)?.analysisCategory !== category) {
      return accountAnalysisGuid !== undefined;
    }
    return !accountAnalyses.some(item => item.guid === accountAnalysisGuid
      && isSingleFacilityAnalysisPair(item, facility.guid, facilityAnalysisGuid));
  };
  return activePairMismatch(account.selectedEnergyAnalysisId, facility.selectedEnergyAnalysisId, 'energy')
    || activePairMismatch(account.selectedWaterAnalysisId, facility.selectedWaterAnalysisId, 'water');
}
