import { AccountAnalysisNamePipe } from './account-analysis-name.pipe';
import { AccountReportNamePipe } from './account-report-name-pipe';
import { AnalysisCategoryPipe } from './analysis-category.pipe';
import { AnalysisItemPipe } from './analysis-item.pipe';
import { FacilityAnalysisNamePipe } from './facility-analysis-name.pipe';
import { FacilityReportNamePipe } from './facility-report-name.pipe';

describe('workspace entity lookup pipes', () => {
  const query = {
    getFacilityAnalysisByGuid: (guid: string) => guid === 'facility-analysis'
      ? { guid, name: 'Facility analysis' }
      : undefined,
    getAccountAnalysisByGuid: (guid: string) => guid === 'account-analysis'
      ? { guid, name: 'Account analysis', analysisCategory: 'energy' }
      : undefined,
    getFacilityReportByGuid: (guid: string) => guid === 'facility-report'
      ? { guid, name: 'Facility report' }
      : undefined,
    getAccountReportByGuid: (guid: string) => guid === 'account-report'
      ? { guid, name: 'Account report' }
      : undefined
  } as any;

  it('returns active workspace entities and names', () => {
    expect(new AnalysisItemPipe(query).transform('facility-analysis')).toEqual({
      guid: 'facility-analysis',
      name: 'Facility analysis'
    });
    expect(new FacilityAnalysisNamePipe(query).transform('facility-analysis')).toBe('Facility analysis');
    expect(new AccountAnalysisNamePipe(query).transform('account-analysis')).toBe('Account analysis');
    expect(new FacilityReportNamePipe(query).transform('facility-report')).toBe('Facility report');
    expect(new AccountReportNamePipe(query).transform('account-report')).toBe('Account report');
    expect(new AnalysisCategoryPipe(query).transform('account-analysis')).toBe('Energy');
  });

  it('preserves the existing missing-reference fallbacks', () => {
    expect(new AnalysisItemPipe(query).transform('missing')).toBeUndefined();
    expect(new FacilityAnalysisNamePipe(query).transform('missing')).toBe('');
    expect(new AccountAnalysisNamePipe(query).transform('missing')).toBe('');
    expect(new FacilityReportNamePipe(query).transform('missing')).toBe('');
    expect(new AccountReportNamePipe(query).transform('missing')).toBe('');
    expect(new AnalysisCategoryPipe(query).transform('missing')).toBe('No Item Found');
  });
});
