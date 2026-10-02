import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { FacilityAnalysisResultsWorkerRequest } from '@platform/web-workers/facility-analysis-results-worker.contract';
import { analysisDependencyClosure, facilityAnalysisResultsFingerprint } from './facility-analysis-results-request';

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
