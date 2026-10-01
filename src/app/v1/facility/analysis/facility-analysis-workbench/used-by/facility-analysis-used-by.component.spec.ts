import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbFacilityReport } from '@data/models/idbModels/facilityReport';
import { buildFacilityAnalysisDependencies } from './facility-analysis-used-by.component';

describe('facility analysis dependency projection', () => {
  it('separates account analyses, reports, banking source, and consumers by GUID', () => {
    const analysis = { guid: 'current', facilityId: 'facility-a', bankedAnalysisItemId: 'source' } as IdbAnalysisItem;
    const source = { guid: 'source' } as IdbAnalysisItem;
    const consumer = { guid: 'consumer', bankedAnalysisItemId: 'current' } as IdbAnalysisItem;
    const accountAnalysis = { guid: 'account-analysis', facilityAnalysisItems: [{ facilityId: 'facility-a', analysisItemId: 'current' }] } as IdbAccountAnalysisItem;
    const report = { guid: 'report', analysisItemId: 'current' } as IdbFacilityReport;

    expect(buildFacilityAnalysisDependencies(analysis, [analysis, source, consumer], [accountAnalysis], [report])).toEqual({
      linkedAccountAnalyses: [accountAnalysis], linkedReports: [report], bankingSource: source, bankingConsumers: [consumer]
    });
  });
});
