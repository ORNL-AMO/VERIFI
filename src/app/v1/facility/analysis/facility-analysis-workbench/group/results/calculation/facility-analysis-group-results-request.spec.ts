import { AnalysisGroup } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { FacilityAnalysisGroupResultsWorkerRequest } from '@platform/web-workers/facility-analysis-group-results-worker.contract';
import {
  facilityAnalysisGroupResultsFingerprint,
  projectAnalysisGroupDependencies,
  projectAnalysisGroupPredictorInputs
} from './facility-analysis-group-results-request';

describe('facility analysis group result requests', () => {
  it('keeps only the selected group throughout the banking dependency chain', () => {
    const current = analysis('current', [group('group-a', 1), group('group-b', 2)], 'banked');
    const banked = analysis('banked', [group('group-a', 3), group('group-b', 4)]);

    const dependencies = projectAnalysisGroupDependencies(current, 'group-a', [current, banked]);

    expect(dependencies.map(item => item.guid)).toEqual(['current', 'banked']);
    expect(dependencies.map(item => item.groups.map(item => item.idbGroupId))).toEqual([['group-a'], ['group-a']]);
  });

  it('projects only predictors referenced by the selected group and its banking chain', () => {
    const dependencies = [
      analysis('current', [group('group-a', 1, 'predictor-a')]),
      analysis('banked', [group('group-a', 2, 'predictor-b')])
    ];
    const projection = projectAnalysisGroupPredictorInputs(
      'facility-a',
      dependencies,
      [
        { guid: 'entry-a', facilityId: 'facility-a', predictorId: 'predictor-a' },
        { guid: 'entry-b', facilityId: 'facility-a', predictorId: 'predictor-b' },
        { guid: 'entry-c', facilityId: 'facility-a', predictorId: 'predictor-c' }
      ] as any,
      [
        { guid: 'predictor-a', facilityId: 'facility-a' },
        { guid: 'predictor-b', facilityId: 'facility-a' },
        { guid: 'predictor-c', facilityId: 'facility-a' }
      ] as any
    );

    expect(projection.entries.map(item => item.guid)).toEqual(['entry-a', 'entry-b']);
    expect(projection.predictors.map(item => item.guid)).toEqual(['predictor-a', 'predictor-b']);
  });

  it('ignores display metadata and unrelated groups while tracking selected-group inputs', () => {
    const original = analysis('current', [group('group-a', 1), group('group-b', 2)]);
    const renamed = { ...original, name: 'Renamed analysis' };
    const unrelatedGroupChanged = analysis('current', [group('group-a', 1), group('group-b', 99)]);
    const selectedGroupChanged = analysis('current', [group('group-a', 99), group('group-b', 2)]);

    expect(fingerprintFor(renamed)).toBe(fingerprintFor(original));
    expect(fingerprintFor(unrelatedGroupChanged)).toBe(fingerprintFor(original));
    expect(fingerprintFor(selectedGroupChanged)).not.toBe(fingerprintFor(original));
  });
});

function fingerprintFor(item: IdbAnalysisItem): string {
  const dependencies = projectAnalysisGroupDependencies(item, 'group-a', [item]);
  const request: FacilityAnalysisGroupResultsWorkerRequest = {
    analysisItem: dependencies[0],
    groupGuid: 'group-a',
    facility: { guid: 'facility-a', fiscalYear: 'calendarYear', fiscalYearMonth: 0, fiscalYearCalendarEnd: true } as any,
    calanderizedMeters: [],
    accountPredictorEntries: [],
    accountPredictors: [],
    accountAnalysisItems: dependencies
  };
  return facilityAnalysisGroupResultsFingerprint(request);
}

function analysis(
  guid: string,
  groups: AnalysisGroup[],
  bankedAnalysisItemId?: string
): IdbAnalysisItem {
  return {
    guid, accountId: 'account-a', facilityId: 'facility-a', name: `Analysis ${guid}`,
    analysisCategory: 'energy', energyIsSource: false, energyUnit: 'MMBtu', waterUnit: 'gal',
    groups, baselineYear: 2020, hasBanking: !!bankedAnalysisItemId, bankedAnalysisItemId
  } as IdbAnalysisItem;
}

function group(idbGroupId: string, regressionConstant: number, predictorId?: string): AnalysisGroup {
  return {
    idbGroupId,
    analysisType: 'absoluteEnergyConsumption',
    regressionConstant,
    predictorVariables: predictorId ? [{ id: predictorId, name: predictorId, productionInAnalysis: true }] : []
  } as AnalysisGroup;
}
