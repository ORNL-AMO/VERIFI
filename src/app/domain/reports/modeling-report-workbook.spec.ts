import { regressionAnalysisReportFixture } from './testing/analysis-report-fixtures';
import { buildAnalysisReportInputs } from './analysis-report-inputs';
import { calculateModelingReport } from './modeling-report-calculation';
import { buildModelingReport } from './modeling-report';
import { modelingReportWorkbook } from './modeling-report-workbook';

function view() {
  const snapshot = regressionAnalysisReportFixture();
  const checks = calculateModelingReport(buildAnalysisReportInputs(snapshot, 'account-analysis'), 2023, [], false);
  return buildModelingReport(checks, { includeIssuesSummary: true, includeExecutiveSummary: true, includeDataValidationTables: false },
    { facilities: { facility: 'Plant A' }, groups: { group: 'Main meters' } });
}

describe('Modeling executive summary workbook projection', () => {
  it('preserves legacy headers, numeric precision, zero coefficients and diagnostic notes without changing inputs', () => {
    const report = view(), model = report.regression[0].model!;
    Object.assign(model, { isUserDefinedModel: false, R2: 0, adjust_R2: 0.987654321012345, modelPValue: 0.000000000000123 });
    model.coef = [0, -1.23456789012345, 0]; model.t.p = [0, 0, 0.123456789012345];
    report.regression[0].minor = ['Minor one', 'Minor two']; report.regression[0].critical = ['Review model'];
    const before = structuredClone(report), workbook = modelingReportWorkbook(report);
    expect(workbook.headers.slice(0, 12)).toEqual(['Facility', 'Group', 'Baseline Year', 'Model Year', 'R2', 'Adjusted R2',
      'Model P-Value', 'Model Equation', 'Minor Issues', 'Critical Issues', 'Moderate Issues', 'Constant']);
    expect(workbook.headers.slice(12)).toEqual(['Coefficient 1 Name', 'Coefficient 1 Value', 'Coefficient 1 p-Value',
      'Coefficient 2 Name', 'Coefficient 2 Value', 'Coefficient 2 p-Value']);
    expect(workbook.rows[0].slice(0, 7)).toEqual(['Plant A', 'Main meters', 2022, 2022, 0, 0.987654321012345, 0.000000000000123]);
    expect(workbook.rows[0].slice(8)).toEqual(['Minor one; Minor two', 'Review model', report.regression[0].moderate.join('; ') || '—',
      0, 'Predictor 0', -1.23456789012345, 0, 'Predictor 1', 0, 0.123456789012345]);
    expect(report).toEqual(before);
  });
  it('keeps missing models diagnostic, pads shorter models, and distinguishes unavailable statistics from zero', () => {
    const report = view();
    const missing = { ...structuredClone(report.regression[0]), model: undefined, critical: ['Select an available model'] };
    const shortened = structuredClone(report.regression[0]);
    shortened.model!.predictorVariables = shortened.model!.predictorVariables.slice(0, 1);
    shortened.model!.coef = [5, 1];
    report.regression.push(missing, shortened);
    const rows = modelingReportWorkbook(report).rows;
    expect(rows[0].slice(4, 7)).toEqual(['—', '—', '—']);
    expect(rows[1][9]).toBe('Select an available model'); expect(rows[1][11]).toBe('—');
    expect(rows.every(row => row.length === 18)).toBe(true); expect(rows[2].slice(-3)).toEqual(['—', '—', '—']);
    Object.assign(shortened.model!, { isUserDefinedModel: false, R2: NaN, adjust_R2: undefined, modelPValue: Infinity });
    expect(modelingReportWorkbook(report).rows[2].slice(4, 7)).toEqual(['—', '—', '—']);
  });
  it.each(['energyIntensity', 'modifiedEnergyIntensity', 'absoluteEnergyConsumption'] as const)('includes %s groups in the existing column layout', method => {
    const report = view(), original = report.groups[0];
    const projected = buildModelingReport({ reportYear: 2023, hasBlockingErrors: false, groups: [{ ...original,
      group: { ...original.group, analysisType: method }, model: undefined }] }, report.settings,
      { facilities: { facility: 'Plant A' }, groups: { group: 'Main meters' } });
    const workbook = modelingReportWorkbook(projected);
    expect(workbook.rows).toHaveLength(1); expect(workbook.rows[0]).toHaveLength(12);
    expect(workbook.rows[0][8]).toBe(method === 'absoluteEnergyConsumption' ? 'Absolute' : method === 'energyIntensity' ? 'Classic Intensity' : 'Modified Intensity');
    expect(workbook.rows[0][7]).toBe(method === 'absoluteEnergyConsumption' ? '—' : 'Predictor 0; Predictor 1; ');
  });
  it('retains a valid header contract for an empty diagnostic report', () => {
    const report = view(); report.regression = []; report.methods = []; report.groups = [];
    expect(modelingReportWorkbook(report)).toMatchObject({ rows: [], headers: expect.arrayContaining(['Facility', 'Constant']) });
  });
});
