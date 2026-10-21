import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { FacilityAnalysisResultsWorkerRequest } from '@platform/web-workers/facility-analysis-results-worker.contract';
import { analysisDependencyClosure, buildFacilityDashboardResultsRequest, facilityAnalysisResultsFingerprint, projectFacilityPredictorInputs } from './facility-analysis-results-request';

describe('facility analysis result requests', () => {
  it('excludes display metadata while retaining calculation settings in the fingerprint', () => {
    const request = requestFixture();
    const renamed = {
      ...request,
      analysisItem: { ...request.analysisItem, name: 'Renamed', modifiedDate: new Date('2026-01-01') }
    };
    const changedBaseline = {
      ...request,
      analysisItem: { ...request.analysisItem, baselineYear: 2021 }
    };

    expect(facilityAnalysisResultsFingerprint(renamed)).toBe(facilityAnalysisResultsFingerprint(request));
    expect(facilityAnalysisResultsFingerprint(changedBaseline)).not.toBe(facilityAnalysisResultsFingerprint(request));
  });

  it('includes the transitive banking chain once and stops cycles', () => {
    const first = analysis('first', 'second');
    const second = analysis('second', 'third');
    const third = analysis('third', 'first');

    expect(analysisDependencyClosure(first, [first, second, third]).map(item => item.guid))
      .toEqual(['first', 'second', 'third']);
  });

  it('projects predictor inputs to the selected facility before fingerprinting and calculation', () => {
    const projection = projectFacilityPredictorInputs(
      'facility-a',
      [
        { guid: 'entry-a', facilityId: 'facility-a', predictorId: 'predictor-a' },
        { guid: 'entry-b', facilityId: 'facility-b', predictorId: 'predictor-b' }
      ] as any,
      [
        { guid: 'predictor-a', facilityId: 'facility-a' },
        { guid: 'predictor-b', facilityId: 'facility-b' }
      ] as any
    );

    expect(projection.entries.map(entry => entry.guid)).toEqual(['entry-a']);
    expect(projection.predictors.map(predictor => predictor.guid)).toEqual(['predictor-a']);
  });
});

function requestFixture(): FacilityAnalysisResultsWorkerRequest {
  return {
    analysisItem: analysis('analysis-a'),
    facility: {
      guid: 'facility-a', fiscalYear: 'calendarYear', fiscalYearMonth: 0,
      fiscalYearCalendarEnd: true
    } as any,
    calanderizedMeters: [],
    accountPredictorEntries: [],
    accountPredictors: [],
    accountAnalysisItems: [analysis('analysis-a')],
    calculateAllMonthlyData: false,
    includeGroupSummaries: true
  };
}

function analysis(guid: string, bankedAnalysisItemId?: string): IdbAnalysisItem {
  return {
    guid, accountId: 'account-a', facilityId: 'facility-a', name: `Analysis ${guid}`,
    analysisCategory: 'energy', energyIsSource: false, energyUnit: 'MMBtu', waterUnit: 'gal',
    groups: [], baselineYear: 2020, hasBanking: !!bankedAnalysisItemId, bankedAnalysisItemId
  } as IdbAnalysisItem;
}

describe('explicit facility dashboard projection', () => {
  it('uses only the owning facility meters, predictors and banking chain', () => {
    const source = { ...analysis('source', 'bank'), groups: [{ idbGroupId: 'group-a' }] } as IdbAnalysisItem;
    const bank = analysis('bank');
    const foreign = { ...analysis('foreign'), facilityId: 'facility-b' };
    const facility = { guid: 'facility-a', accountId: 'account-a' } as any;
    const snapshot = { account: { guid: 'account-a' }, facilityAnalyses: [source, bank, foreign],
      meters: [{ guid: 'meter-a', facilityId: 'facility-a', groupId: 'group-a' }, { guid: 'meter-b', facilityId: 'facility-b', groupId: 'group-a' }],
      predictors: [{ guid: 'predictor-a', facilityId: 'facility-a' }, { guid: 'predictor-b', facilityId: 'facility-b' }],
      predictorData: [{ guid: 'reading-a', facilityId: 'facility-a' }, { guid: 'reading-b', facilityId: 'facility-b' }] } as any;
    const project = vi.fn(() => ({ state: 'ready' as const, accountGuid: 'account-a', inputFingerprint: 'base', meters: [] }));
    const request = buildFacilityDashboardResultsRequest(source, facility, snapshot, project)!;
    expect(project).toHaveBeenCalledWith(expect.objectContaining({ context: { kind: 'facility', guid: 'facility-a' }, meterGuids: ['meter-a'], energyUnit: 'MMBtu' }));
    expect(request.accountAnalysisItems.map(item => item.guid)).toEqual(['source', 'bank']);
    expect(request.accountPredictors.map(item => item.guid)).toEqual(['predictor-a']);
    expect(request.accountPredictorEntries.map(item => item.guid)).toEqual(['reading-a']);
    expect(request.analysisItem).not.toBe(source);
    expect(buildFacilityDashboardResultsRequest(source, { ...facility, guid: 'facility-b' }, snapshot, project)).toBeUndefined();
  });
});
