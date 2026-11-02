import { buildAnalysisReportInputs } from '@domain/reports/analysis-report-inputs';
import { calculateBetterPlantsReport } from '@domain/reports/better-plants-report-calculation';
import { analysisReportFixture } from '@domain/reports/testing/analysis-report-fixtures';
import { buildBetterPlantsPages } from './better-plants-report.view';

describe('Better Plants form projection', () => {
  it.each(['energy', 'water'] as const)('preserves %s values and includes notes only for the selected report year', category => {
    const snapshot = analysisReportFixture(category), inputs = buildAnalysisReportInputs(snapshot, 'account-analysis');
    const report = { ...snapshot.accountReports[0], reportYear: 2024, betterPlantsReportSetup: { ...snapshot.accountReports[0].betterPlantsReportSetup, modificationNotes: 'New equipment' } };
    const summaries = calculateBetterPlantsReport(inputs, [2024, 2023]);
    const pages = buildBetterPlantsPages(report, snapshot.account, 2022, category, summaries, snapshot.facilities);
    expect(pages.map(page => page.year)).toEqual([2024, 2023]);
    expect(pages[0].notes.some(note => note.text === 'New equipment')).toBe(true); expect(pages[1].notes).toEqual([]);
    const total = pages[0].metrics.find(row => row.label.startsWith('Total ') && row.label.includes('Savings'))!;
    expect(total.report).toBe(category === 'water' ? summaries[0].totalWaterSavings : summaries[0].totalEnergySavings);
    expect(pages[0].consumption.at(-1)?.baseline).toBe(category === 'water' ? summaries[0].baselineYearWaterResults.totalWaterIntake : summaries[0].baselineYearEnergyResults.totalEnergyUse);
  });
  it('preserves fiscal labels, optional water metrics and additional-water markers', () => {
    const snapshot = analysisReportFixture('water'), inputs = buildAnalysisReportInputs(snapshot, 'account-analysis');
    const summary = structuredClone(calculateBetterPlantsReport(inputs, [2023])[0]);
    summary.reportYearWaterResults.additionalWaterUtility.use = 123.456789;
    summary.reportYearWaterResults.additionalWaterUtility.meteredType = 'Estimated';
    summary.reportYearWaterResults.totalWaterIntakeIncludeAdditional += 123.456789;
    const report = { ...snapshot.accountReports[0], betterPlantsReportSetup: { ...snapshot.accountReports[0].betterPlantsReportSetup, baselineYearWaterPilotGoal: 0, reportYearWaterPilotGoal: 3 } };
    const [page] = buildBetterPlantsPages(report, { ...snapshot.account, fiscalYear: 'nonCalendarYear', fiscalYearMonth: 6, fiscalYearCalendarEnd: true }, 2022, 'water', [summary], snapshot.facilities);
    expect(page.baselineLabel).toBe('FY - 2022 (Jul 21 – Jun 22)');
    expect(page.waterPilot).toMatchObject({ baseline: 0, report: 3 }); expect(page.additionalWater).toBe(true);
    expect(page.consumption.find(row => row.additional)).toMatchObject({ report: 123.456789, reportMetered: 'Estimated' });
  });
  it('retains the existing strict performance thresholds and resolves current facility names', () => {
    const snapshot = analysisReportFixture(), inputs = buildAnalysisReportInputs(snapshot, 'account-analysis');
    const summary = structuredClone(calculateBetterPlantsReport(inputs, [2023])[0]);
    const report = { ...snapshot.accountReports[0], betterPlantsReportSetup: { ...snapshot.accountReports[0].betterPlantsReportSetup, includePerformanceTable: true } };
    summary.facilityPerformance = [{ facility: { ...snapshot.facilities[0] }, performance: 2 }];
    expect(buildBetterPlantsPages(report, snapshot.account, 2022, 'energy', [summary], snapshot.facilities)[0].performance.reduce((sum, band) => sum + band.count, 0)).toBe(0);
    summary.facilityPerformance[0].performance = 1;
    const page = buildBetterPlantsPages(report, snapshot.account, 2022, 'energy', [summary], [{ ...snapshot.facilities[0], name: 'Updated plant name' }])[0];
    expect(page.performance.find(band => band.count === 1)).toMatchObject({ label: '0-2%', facilities: ['Updated plant name'] });
  });
});
