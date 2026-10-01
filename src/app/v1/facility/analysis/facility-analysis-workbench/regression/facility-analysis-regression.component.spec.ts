import { AnalysisGroup } from '@data/models/analysis';
import { modelRangeMonthCount } from './facility-analysis-regression.component';

describe('facility analysis regression behavior', () => {
  it('requires at least twelve inclusive months for model generation', () => {
    expect(modelRangeMonthCount({
      regressionModelStartMonth: 0,
      regressionStartYear: 2024,
      regressionModelEndMonth: 11,
      regressionEndYear: 2024
    } as AnalysisGroup)).toBe(12);
    expect(modelRangeMonthCount({
      regressionModelStartMonth: 5,
      regressionStartYear: 2024,
      regressionModelEndMonth: 4,
      regressionEndYear: 2025
    } as AnalysisGroup)).toBe(12);
    expect(modelRangeMonthCount({
      regressionModelStartMonth: 1,
      regressionStartYear: 2024,
      regressionModelEndMonth: 10,
      regressionEndYear: 2024
    } as AnalysisGroup)).toBe(10);
  });

  it('returns zero for incomplete ranges', () => {
    expect(modelRangeMonthCount({ regressionStartYear: 2024 } as AnalysisGroup)).toBe(0);
  });
});
