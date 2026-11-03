import { calculateAnalysisDataChecks } from '@domain/reports/analysis-data-checks';
import { buildFacilityAnalysisReportInputs } from '@domain/reports/analysis-report-inputs';
import { facilityAnalysisReportFixture } from '../testing/analysis-report-test-fixtures';
import { buildFacilityAnalysisDocument } from '../analysis-report-document';
import { facilityAnalysisOutputBlocks, nativeChart } from './analysis-report-output.view';
import { annualResultChartsView, monthlySavingsChartView, monthlyResultChartsView } from '@app/v1/shared/analysis-results/chart/analysis-result-chart.view';
import { analysisPdfDocument, analysisPptDocument } from './analysis-report-output.service';
import { regressionAnalysisReportFixture } from '@domain/reports/testing/analysis-report-fixtures';

describe('facility Analysis output projections', () => {
  function fixture() {
    const fixture = facilityAnalysisReportFixture();
    const inputs = buildFacilityAnalysisReportInputs(fixture.snapshot, fixture.facility.guid, fixture.analysis.guid);
    const checks = calculateAnalysisDataChecks(inputs, fixture.report.analysisReportSettings.reportYear);
    const document = buildFacilityAnalysisDocument(fixture.report, fixture.analysis, fixture.facility, fixture.results, [checks], { group: 'Production' });
    return { ...fixture, document };
  }

  it('preserves configured section ordering and identifying values in both document formats', () => {
    const { document } = fixture();
    const blocks = facilityAnalysisOutputBlocks(document);
    expect(blocks.map(block => block.title)).toEqual(document.sections.map(section => section.heading));
    const pdf = analysisPdfDocument(document, blocks, new Map());
    const ppt = analysisPptDocument(document, blocks, new Map());
    expect(pdf.metadata.title).toBe(document.name);
    expect(ppt.slides[0]).toMatchObject({ type: 'title', title: document.name });
    const tables = blocks.flatMap(block => block.entries).filter(entry => entry.kind === 'table');
    expect(tables.length).toBeGreaterThan(0);
    expect(tables[0].rows.some(row => row[0].includes(String(document.analysis.baselineYear)))).toBe(true);
    expect(tables[0].headers.some(header => header.content.includes(document.unit))).toBe(true);
  });

  it('exports only the same enabled sections as the preview and deduplicates coincident monthly years', () => {
    const { report, analysis, facility, results } = fixture();
    const settings = { ...report.analysisReportSettings, facilityAnnualResults: false, facilityGroupContributions: false, groupReports: false,
      facilityMonthlyResults: true, facilityMonthlyResultsGraphs: false, facilityMonthlyResultsTable: true, reportYear: analysis.baselineYear };
    const document = buildFacilityAnalysisDocument({ ...report, analysisReportSettings: settings }, analysis, facility,
      { ...results, reportYear: analysis.baselineYear }, [], {});
    expect(document.sections.map(section => section.kind)).toEqual(['facility-monthly']);
    const blocks = facilityAnalysisOutputBlocks(document);
    expect(blocks[0].entries.filter(entry => entry.kind === 'table')).toHaveLength(1);
    expect(blocks[0].entries.some(entry => entry.kind === 'figure')).toBe(false);
  });

  it('retains zero and negative values in editable charts and switches gaps to images', () => {
    const view = annualResultChartsView([], 'energy', 'MMBtu');
    const projected = { ...view, useRows: [{ periodKey: '2023', periodLabel: '2023', sortValue: 2023, values: { actual: 0, calculated: -2 } }] };
    const native = nativeChart(projected, 'use', 'Use');
    expect(native?.series.map(series => series.data)).toEqual([[0], [-2]]);
    expect(native?.valAxisMinVal).toBe(-2);
    expect(nativeChart({ ...projected, useRows: [{ ...projected.useRows[0], values: { actual: 0, calculated: null } }] }, 'use', 'Use')).toBeUndefined();
  });

  it('formats result-table percentages with the same two decimal places as the preview', () => {
    const { document } = fixture();
    const results = { ...document.results, annualAnalysisSummaries: document.results.annualAnalysisSummaries.map(row =>
      ({ ...row, totalSavingsPercentImprovement: 1.23456, annualSavingsPercentImprovement: -2.34567 })) };
    const blocks = facilityAnalysisOutputBlocks({ ...document, results });
    const table = blocks[0].entries.find(entry => entry.kind === 'table')!;
    expect(table.rows[0]).toContain('1.23%'); expect(table.rows[0]).toContain('-2.35%');
  });

  it('uses the existing monthly banking projection rather than reconstructing its savings', () => {
    const { results } = fixture();
    const view = monthlyResultChartsView(results.monthlyAnalysisSummaryData, results.monthlyAnalysisSummaryData, 'energy', 'MMBtu', true);
    const chart = nativeChart(view, 'improvement', 'Savings');
    const savings = monthlySavingsChartView(results.monthlyAnalysisSummaryData, true);
    expect(chart?.barGrouping).toBe('stacked');
    expect(chart?.series.map(series => series.data)).toEqual(savings.metrics.map(metric => savings.rows.map(row => row.values[metric.id])));
  });

  it('includes regression formula, predictor checks, and the shaded comparison figure', () => {
    const data = facilityAnalysisReportFixture(regressionAnalysisReportFixture());
    const checks = calculateAnalysisDataChecks(buildFacilityAnalysisReportInputs(data.snapshot, data.facility.guid, data.analysis.guid), 2023);
    const document = buildFacilityAnalysisDocument(data.report, data.analysis, data.facility, data.results, [checks], { group: 'Production' });
    const block = facilityAnalysisOutputBlocks(document).find(block => block.title.includes('Model details'))!;
    const tables = block.entries.filter(entry => entry.kind === 'table');
    expect(tables.map(table => table.title)).toEqual(['Regression model', 'Predictor validation']);
    expect(tables[0].rows[0].join(' ')).toContain('Predictor 0');
    expect(tables[1].headers.map(header => header.content)).toContain('Predictor 1');
    const figure = block.entries.find(entry => entry.kind === 'figure');
    expect(figure?.native).toBeUndefined();
    expect(figure?.option.series).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'scatter' }), expect.objectContaining({ type: 'line', markArea: expect.any(Object) })]));
  });

  it('bounds dense contribution panels without losing groups/years or changing their color scale', () => {
    const { document } = fixture();
    const groups = Array.from({ length: 25 }, (_, index) => ({ groupId: `group-${index}`, groupName: `Group ${index}` }));
    const years = Array.from({ length: 20 }, (_, index) => ({ year: 2023 + index, totalSavings: 1, totalSavingsPercent: 1, totalContributionPercent: 1,
      groups: groups.map((group, index) => ({ ...group, savings: 1, savingsPercent: 1, contributionPercent: index - 12 })) }));
    const blocks = facilityAnalysisOutputBlocks({ ...document, settings: { ...document.settings, facilityGroupContributions: true,
      facilityGroupContributionsTable: true, facilityGroupContributionsGraphs: true },
      sections: [{ id: 'contributions', kind: 'facility-group-contributions', heading: 'Group contributions' }], contributions: { groups, years } });
    const figures = blocks[0].entries.filter(entry => entry.kind === 'figure');
    expect(figures).toHaveLength(9);
    expect(figures.every(figure => (figure.option.visualMap as { min: number; max: number }).min === -12
      && (figure.option.visualMap as { min: number; max: number }).max === 12)).toBe(true);
    const table = blocks[0].entries.find(entry => entry.kind === 'table')!;
    expect(table.rows).toHaveLength(20 * 26);
    expect(table.rows.at(-1)?.[0]).toBe('Group 24');
  });
});
