import { AnalysisGroupPredictorVariable, AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from '@data/models/analysis';
import { DEFAULT_ANALYSIS_TABLE_COLUMNS } from '../display/analysis-results-display.service';
import { analysisResultsTableView } from './analysis-results-table.view';

describe('Analysis table display projection', () => {
  const predictor = { id: 'production', name: 'Production', unit: 'widgets' } as AnalysisGroupPredictorVariable;
  const columns = { ...DEFAULT_ANALYSIS_TABLE_COLUMNS, modeledEnergy: true, productionVariables: true, bankedSavings: true, rolling12MonthImprovement: true };

  it('retains annual values, predictor GUIDs and existing transition display rules', () => {
    const row = { year: 2024, energyUse: 0, adjusted: 100, baselineAdjustmentForNormalization: 5,
      savingsBanked: 4, newSavings: 3, totalSavingsPercentImprovement: 6, annualSavingsPercentImprovement: 2,
      predictorUsage: [{ predictorId: 'production', usage: 42 }] } as AnnualAnalysisSummary;
    const table = analysisResultsTableView([{ row, markers: ['transition'] }], columns, [predictor], 'annual', true);
    const values = Object.fromEntries(table.headers.map((header, index) => [header.id, table.rows[0].cells[index].value]));
    expect(values['actualEnergy']).toBe(0);
    expect(values['adjusted']).toBeNull();
    expect(values['baselineAdjustmentForNormalization']).toBe(5);
    expect(values['bankedSavings']).toBeNull();
    expect(values['predictor:production']).toBe(42);
    expect(values['newSavings']).toBe(3);
    expect(values['totalSavingsPercentImprovement']).toBe(6);
    expect(values['annualSavingsPercentImprovement']).toBe(2);
    expect(values).not.toHaveProperty('modeledEnergy');
  });

  it('retains monthly fiscal years, group modeled values, missing rows and banking visibility', () => {
    const row = { date: new Date(2023, 6, 1), fiscalYear: 2024, energyUse: 2.123456789, modeledEnergy: 3,
      rolling12MonthImprovement: 1.2345, missingValueWarning: true } as MonthlyAnalysisSummaryData;
    const table = analysisResultsTableView([{ row, markers: [], isFiscalYearEnd: true }], columns, [], 'monthly', false, true);
    expect(table.rows[0]).toMatchObject({ label: 'Jul 2023', missing: true, fiscalYearEnd: true });
    expect(table.rows[0].cells[0]).toEqual({ value: null, text: '2024' });
    const values = Object.fromEntries(table.headers.map((header, index) => [header.id, table.rows[0].cells[index].value]));
    expect(values['actualEnergy']).toBe(2.123456789);
    expect(values['modeledEnergy']).toBe(3);
    expect(values['rolling12MonthImprovement']).toBe(1.2345);
    expect(values).not.toHaveProperty('bankedSavings');
    expect(analysisResultsTableView([{ row, markers: [] }], columns, [], 'monthly', false).headers.some(header => header.id === 'modeledEnergy')).toBe(false);
  });

  it.each([NaN, Infinity, undefined])('normalizes invalid consumption and aliased adjustment values (%s) without rounding valid values', invalid => {
    const row = { year: 2024, energyUse: invalid, baselineAdjustmentForOtherV2: invalid,
      savingsBanked: 1.23456789 } as AnnualAnalysisSummary;
    const table = analysisResultsTableView([{ row, markers: [] }], columns, [], 'annual', true);
    const values = Object.fromEntries(table.headers.map((header, index) => [header.id, table.rows[0].cells[index].value]));
    expect(values['actualEnergy']).toBeNull();
    expect(values['baselineAdjustmentForOther']).toBeNull();
    expect(values['bankedSavings']).toBe(1.23456789);
  });
});
