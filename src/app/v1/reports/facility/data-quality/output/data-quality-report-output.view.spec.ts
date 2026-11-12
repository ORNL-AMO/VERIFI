import { buildMeterDataQualityReport } from '@domain/calculations/data-quality/meter-data-quality';
import { buildPredictorDataQualityReport } from '@domain/calculations/data-quality/predictor-data-quality';
import { ReportSection } from '@shared/report-output/report-section.model';
import { dataQualityPdfSnapshot } from '../testing/data-quality-report-test-fixtures';
import { METER_CONTENT_FLAGS, PREDICTOR_CONTENT_FLAGS } from '../data-quality-report-settings';
import { dataQualityHasPdfContent, dataQualityPdfDocument } from './data-quality-report-output.view';

function titles(sections: readonly ReportSection[]) { return sections.map(section => section.title); }
describe('Data Quality PDF content', () => {
  it('shares report values and source order, formats annual years chronologically, and retains session bins', () => {
    const snapshot = dataQualityPdfSnapshot(), before = structuredClone(snapshot);
    const { document, charts } = dataQualityPdfDocument(snapshot);
    expect(document.sections.filter(section => section.type === 'heading').map(section => section.title))
      .toEqual(['Meter a', 'Predictor a']);
    const statistics = document.sections.find(section => section.type === 'table')!;
    if (statistics.type !== 'table') throw new Error('Missing statistics table');
    expect(statistics.rows[0]).toContain('32.5');
    expect(statistics.rows[1]).toContain('$65');
    expect(charts).toHaveLength(6);
    expect(titles(document.sections)).toEqual(expect.arrayContaining([
      'Distribution of Total Consumption - Number of bins: 7; Bin Size: 13',
      expect.stringContaining('Number of bins: 12'), expect.stringContaining('Number of bins: 9')
    ]));
    const annual = document.sections.find(section => section.title === 'Annual Totals')!;
    if (annual.type !== 'table') throw new Error('Missing annual table');
    expect(annual.rows.map(row => row[0])).toEqual(['2024', '2025']);
    expect(annual.rows.map(row => row[2])).toEqual(['$250', '$260']);
    expect(snapshot).toEqual(before);
    expect(charts.every(chart => !chart.section.imageDataProvider)).toBe(true);
    expect(document.sections.some(section => section.type === 'text'
      && section.content.includes('Months with multiple readings'))).toBe(true);
  });

  const options = [
    ['includeMeterStatisticsTable', 'Total Consumption and Cost Statistics'],
    ['includeMeterConsumptionTimeseriesGraph', 'Total Consumption'],
    ['includeMeterCostTimeseriesGraph', 'Total Cost'],
    ['includeMeterConsumptionHistogram', 'Distribution of Total Consumption'],
    ['includeMeterCostHistogram', 'Distribution of Total Cost'],
    ['includeAnnualTotalsTable', 'Annual Totals'],
    ['includePredictorStatisticsTable', 'Predictor Consumption Statistics'],
    ['includePredictorTimeseriesGraph', 'Predictor Readings'],
    ['includePredictorHistogram', 'Distribution of Predictors']
  ] as const;
  it.each(options)('honors the independent %s content option', (flag, title) => {
    const snapshot = dataQualityPdfSnapshot();
    const included = () => dataQualityPdfDocument(snapshot).document.sections.some(section =>
      section.title === title || title.startsWith('Distribution of') && section.title?.startsWith(title));
    snapshot.settings[flag] = false;
    expect(included()).toBe(false);
    for (const key of [...METER_CONTENT_FLAGS, ...PREDICTOR_CONTENT_FLAGS, 'includeAnnualTotalsTable'] as const) {
      snapshot.settings[key] = key === flag;
    }
    expect(included()).toBe(true);
  });

  it('retains annual totals without meter details, and detects no applicable content', () => {
    const snapshot = dataQualityPdfSnapshot();
    for (const flag of [...METER_CONTENT_FLAGS, ...PREDICTOR_CONTENT_FLAGS]) snapshot.settings[flag] = false;
    snapshot.settings.includeMeter = false;
    expect(dataQualityHasPdfContent(snapshot)).toBe(true);
    expect(titles(dataQualityPdfDocument(snapshot).document.sections)).toContain('Annual Totals');
    snapshot.settings.includeAnnualTotalsTable = false;
    expect(dataQualityHasPdfContent(snapshot)).toBe(false);
    snapshot.settings.includePredictorStatisticsTable = true;
    snapshot.results.predictors = [];
    expect(dataQualityHasPdfContent(snapshot)).toBe(false);
  });

  it.each([0, NaN, 'balanced'] as const)('explains unavailable costs for %s and keeps annual cost values', cost => {
    const snapshot = dataQualityPdfSnapshot(), report = snapshot.results.meters[0];
    const readings = report.meterData.map((row, index) => ({ ...row,
      totalCost: cost === 'balanced' ? index % 2 ? 10 : -10 : cost }));
    snapshot.results.meters = [buildMeterDataQualityReport(readings, report.meter)];
    const { document, charts } = dataQualityPdfDocument(snapshot);
    expect(charts.map(chart => chart.section.title)).not.toContain('Total Cost');
    expect(charts.some(chart => chart.section.title?.startsWith('Distribution of Total Cost'))).toBe(false);
    expect(titles(document.sections).filter(title => title === 'Cost charts unavailable')).toHaveLength(1);
    snapshot.settings.includeMeterCostTimeseriesGraph = false;
    snapshot.settings.includeMeterCostHistogram = false;
    expect(titles(dataQualityPdfDocument(snapshot).document.sections)).not.toContain('Cost charts unavailable');
    expect(titles(document.sections)).toContain('Annual Totals');
  });

  it('exports empty/invalid sources as explanations and retains excluded-meter time-series policy', () => {
    const snapshot = dataQualityPdfSnapshot(), meter = snapshot.results.meters[0];
    snapshot.results.meters = [buildMeterDataQualityReport([], meter.meter)];
    snapshot.results.predictors = [buildPredictorDataQualityReport([], snapshot.results.predictors[0].predictor)];
    let output = dataQualityPdfDocument(snapshot);
    expect(output.charts).toHaveLength(0);
    expect(output.document.sections).toContainEqual(
      expect.objectContaining({ content: 'No readings found for this meter.' }));
    const predictor = snapshot.results.predictors[0];
    snapshot.results.predictors = [buildPredictorDataQualityReport([{ ...dataQualityPdfSnapshot()
      .results.predictors[0].readings[0], amount: NaN }], predictor.predictor)];
    expect(dataQualityPdfDocument(snapshot).document.sections.some(section => section.type === 'text'
      && section.content.startsWith('No usable values.'))).toBe(true);
    snapshot.results.meters = [buildMeterDataQualityReport(meter.meterData,
      { ...meter.meter, source: 'Electricity', includeInEnergy: false })];
    output = dataQualityPdfDocument(snapshot);
    expect(output.charts.some(chart => chart.section.title === 'Total Consumption')).toBe(true);
    expect(output.charts.some(chart => chart.section.title
      ?.startsWith('Distribution of Total Consumption'))).toBe(false);
    expect(output.document.sections.some(section => section.type === 'text'
      && section.content.includes('excluded from energy totals'))).toBe(true);
  });

  it('preserves weather evidence and predictor zero-MAD behavior without adding status findings', () => {
    const snapshot = dataQualityPdfSnapshot(), report = snapshot.results.predictors[0];
    snapshot.results.meters = [];
    snapshot.results.predictors = [buildPredictorDataQualityReport(report.readings.map(row => ({ ...row, amount: 10 })),
      { ...report.predictor, predictorType: 'Weather', weatherDataType: 'HDD', heatingBaseTemperature: 60 })];
    const { document, charts } = dataQualityPdfDocument(snapshot);
    expect(document.sections).toContainEqual(expect.objectContaining({
      content: 'Heating Degree Days (Base Temperature: 60 °F)'
    }));
    expect(document.sections.some(section => section.type === 'text'
      && section.content.startsWith('Incomplete weather source data:'))).toBe(true);
    expect(snapshot.results.predictors[0].statistics.outliers).toBe(0);
    expect(charts).toHaveLength(2);
  });

  it('keeps finite values in histograms when their dates cannot be plotted in time series', () => {
    const snapshot = dataQualityPdfSnapshot(), predictor = snapshot.results.predictors[0];
    snapshot.results.meters = [];
    snapshot.results.predictors = [buildPredictorDataQualityReport(
      predictor.readings.map(row => ({ ...row, year: NaN, amount: 5 })), predictor.predictor)];
    const output = dataQualityPdfDocument(snapshot);
    expect(output.charts).toHaveLength(1);
    expect(output.charts[0].section.title).toContain('Distribution of Predictors');
    expect(output.document.sections).toContainEqual(expect.objectContaining({
      content: 'No readings have valid months and years for the time series.'
    }));
  });

  it.each([
    { name: 'electricity', columns: [
      { key: 'energyUse', label: 'Total Energy', unit: 'kWh' },
      { key: 'totalWithLocationEmissions', label: 'Location Emissions', unit: 'tonne CO₂e' }
    ] },
    { name: 'water', columns: [{ key: 'energyConsumption', label: 'Total Consumption', unit: 'kgal' }] },
    { name: 'fuel', columns: [
      { key: 'energyConsumption', label: 'Total Consumption', unit: 'ft3' },
      { key: 'stationaryEmissions', label: 'Total Emissions', unit: 'tonne CO₂e' }
    ] },
    { name: 'REC', columns: [
      { key: 'RECs', label: 'RECs', unit: 'MWh' }, { key: 'excessRECs', label: 'Excess RECs', unit: 'MWh' }
    ] }
  ] as const)('retains supplied annual $name columns and PDF-readable units', ({ name, columns }) => {
    const snapshot = dataQualityPdfSnapshot(), annual = snapshot.results.annualTotals[0];
    const { document } = dataQualityPdfDocument({ ...snapshot, results: { ...snapshot.results, annualTotals: [{
      ...annual, columns: [{ key: 'year', label: 'Year' }, ...columns, { key: 'energyCost', label: 'Cost', unit: '$' }],
      rows: [{ ...annual.rows[0], RECs: 3 }]
    }] } });
    const table = document.sections.find(section => section.title === 'Annual Totals')!;
    if (table.type !== 'table') throw new Error('Missing annual table');
    expect(table.headers).toHaveLength(columns.length + 2);
    expect(table.headers.join(' ')).not.toMatch(/<|>|₂|&#/);
    if (name === 'fuel') expect(table.headers).toContain('Total Consumption (ft³)');
    expect(table.rows[0]).toHaveLength(columns.length + 2);
    expect(table.rows[0].at(-1)).toBe('$260');
    if (columns.some(column => column.key === 'RECs')) expect(table.rows[0][1]).toBe('3');
  });
});
