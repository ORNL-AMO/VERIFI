import { IdbAccount } from '@data/models/idbModels/account';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbFacility } from '@data/models/idbModels/facility';
import {
  buildSingleFacilityAnalysisPair,
  isSingleFacilityAnalysisPair,
  singleFacilityAnalysisPairIsCurrent,
  singleFacilityAnalysisPairsNeedSync
} from './single-facility-analysis-pairs';

describe('single-facility analysis pairs', () => {
  const account = {
    guid: 'account-a',
    isSingleFacilityCompany: true,
    energyUnit: 'MMBtu',
    volumeLiquidUnit: 'gal',
    energyIsSource: true,
    selectedEnergyAnalysisId: undefined,
    selectedWaterAnalysisId: undefined,
    sustainabilityQuestions: {
      energyReductionBaselineYear: 2020,
      waterReductionBaselineYear: 2021
    }
  } as IdbAccount;
  const facility = { guid: 'facility-a', accountId: account.guid } as IdbFacility;
  const facilityAnalysis = {
    guid: 'facility-analysis-a',
    accountId: account.guid,
    facilityId: facility.guid,
    name: 'Facility energy plan',
    analysisCategory: 'energy',
    energyIsSource: false,
    energyUnit: 'kBtu',
    waterUnit: 'gal',
    baselineYear: 2022,
    hasBanking: true,
    modifiedDate: new Date('2026-10-13T00:00:00Z')
  } as IdbAnalysisItem;

  it('projects one hidden account analysis from each facility analysis', () => {
    const pair = buildSingleFacilityAnalysisPair(account, facility, facilityAnalysis);

    expect(pair).toMatchObject({
      accountId: account.guid,
      name: facilityAnalysis.name,
      analysisCategory: 'energy',
      energyIsSource: false,
      energyUnit: 'kBtu',
      baselineYear: 2022,
      hasBanking: true,
      facilityItemsInitialized: true,
      facilityAnalysisItems: [{
        facilityId: facility.guid,
        analysisItemId: facilityAnalysis.guid
      }]
    });
    expect(isSingleFacilityAnalysisPair(pair, facility.guid, facilityAnalysis.guid)).toBe(true);
  });

  it('requires synchronization for missing, stale, or incorrectly active pairs', () => {
    const pair = buildSingleFacilityAnalysisPair(account, facility, facilityAnalysis);
    const activeFacility = { ...facility, selectedEnergyAnalysisId: facilityAnalysis.guid };

    expect(singleFacilityAnalysisPairsNeedSync(account, activeFacility, [facilityAnalysis], [])).toBe(true);
    expect(singleFacilityAnalysisPairsNeedSync(account, activeFacility, [facilityAnalysis], [
      { ...pair, name: 'Stale name' }
    ])).toBe(true);
    expect(singleFacilityAnalysisPairsNeedSync(account, activeFacility, [facilityAnalysis], [pair])).toBe(true);
    expect(singleFacilityAnalysisPairsNeedSync(
      { ...account, selectedEnergyAnalysisId: pair.guid },
      activeFacility,
      [facilityAnalysis],
      [pair]
    )).toBe(false);

    const alternatePair = { ...pair, guid: 'alternate-pair' };
    expect(singleFacilityAnalysisPairsNeedSync(
      { ...account, selectedEnergyAnalysisId: alternatePair.guid },
      activeFacility,
      [facilityAnalysis],
      [pair, alternatePair]
    )).toBe(false);
  });

  it('preserves pair identity while mirroring facility analysis edits', () => {
    const original = buildSingleFacilityAnalysisPair(account, facility, facilityAnalysis);
    const updated = buildSingleFacilityAnalysisPair(account, facility, {
      ...facilityAnalysis,
      name: 'Updated facility plan',
      baselineYear: 2023
    }, { ...original, id: 17 } as IdbAccountAnalysisItem);

    expect(updated).toMatchObject({ id: 17, guid: original.guid, name: 'Updated facility plan', baselineYear: 2023 });
    expect(singleFacilityAnalysisPairIsCurrent(updated, facility, {
      ...facilityAnalysis,
      name: 'Updated facility plan',
      baselineYear: 2023
    })).toBe(true);
  });
});
