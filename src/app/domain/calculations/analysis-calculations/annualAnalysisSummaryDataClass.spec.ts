import { MonthlyAnalysisSummaryData } from '@data/models/analysis';
import { IdbFacility } from '@data/models/idbModels/facility';
import { AnnualAnalysisSummaryDataClass } from './annualAnalysisSummaryDataClass';

describe('AnnualAnalysisSummaryDataClass fiscal-year completeness', () => {
  it('includes missing predictor data from the prior calendar year in a non-calendar fiscal year', () => {
    const rows = [
      monthlyRow(new Date(2024, 10, 1), 2025, true, ['predictor-a']),
      monthlyRow(new Date(2025, 0, 1), 2025, false, [])
    ];

    const summary = new AnnualAnalysisSummaryDataClass(
      rows,
      2025,
      [],
      { guid: 'facility-a', fiscalYear: 'nonCalendarYear', fiscalYearMonth: 9 } as IdbFacility,
      [],
      []
    );

    expect(summary.yearAnalysisSummaryData).toEqual(rows);
    expect(summary.missingPredictorValue).toBe(true);
    expect(summary.missingPredictors).toEqual(['predictor-a']);
  });
});

function monthlyRow(
  date: Date,
  fiscalYear: number,
  missingValueWarning: boolean,
  missingPredictors: string[]
): MonthlyAnalysisSummaryData {
  return {
    date,
    fiscalYear,
    missingValueWarning,
    missingPredictors,
    energyUse: 100,
    adjusted: 110,
    savings: 10,
    savingsBanked: 0,
    savingsUnbanked: 10,
    baselineAdjustmentForNormalization: 0,
    baselineAdjustmentForOtherV2: 0,
    baselineAdjustment: 0,
    baselineAdjustmentInput: 0,
    modelYearDataAdjustment: 0,
    dataAdjustment: 0
  } as MonthlyAnalysisSummaryData;
}
