import { getCalanderizedMeterData } from '@domain/calculations/calanderization/calanderizeMeters';
import { buildFacilityAnalysisReportInputs } from './analysis-report-inputs';
import { calculateModelingReport } from './modeling-report-calculation';
import { regressionAnalysisReportFixture } from './testing/analysis-report-fixtures';
import { calculateAnalysisDataChecks } from './analysis-data-checks';

describe('Modeling report monthly comparison', () => {
  function fixture(category: 'energy' | 'water' = 'energy') {
    const original = regressionAnalysisReportFixture();
    const snapshot = { ...original, facilityAnalyses: original.facilityAnalyses.map(analysis => ({ ...analysis,
      analysisCategory: category, waterUnit: category === 'water' ? 'gal' : analysis.waterUnit })) };
    if (category === 'water') {
      Object.assign(snapshot.meters[0], { source: 'Water Intake', startingUnit: 'kgal', waterIntakeType: 'Municipal (Potable)' });
    }
    const inputs = buildFacilityAnalysisReportInputs(snapshot, 'facility', 'facility-analysis');
    const meters = getCalanderizedMeterData([...snapshot.meters], [...snapshot.meterData], snapshot.facilities[0], false,
      { energyIsSource: inputs.analysis.energyIsSource, neededUnits: category === 'water' ? inputs.analysis.waterUnit : inputs.analysis.energyUnit }, [], [],
      [...snapshot.facilities], snapshot.account.assessmentReportVersion, []);
    return { inputs, meters };
  }
  it('uses the selected report year, canonical actuals and predictor coefficients without mutating inputs', () => {
    const { inputs, meters } = fixture(), before = structuredClone({ inputs, meters });
    const result = calculateModelingReport(inputs, 2023, meters);
    const chart = result.charts![0];
    expect(chart).toMatchObject({ source: 'user-defined', category: 'energy', unit: 'MMBtu', modelYear: 2022 });
    expect(chart.monthly).toHaveLength(24);
    expect(chart.monthly.at(-1)!.fiscalYear).toBe(2023);
    expect(chart.monthly[0]).toMatchObject({ energyUse: 100.25, modeledEnergy: 75 });
    expect(chart.monthly.at(-1)).toMatchObject({ energyUse: 80.125, modeledEnergy: 101 });
    expect(calculateModelingReport(inputs, 2022, meters).charts![0].monthly).toHaveLength(12);
    expect({ inputs, meters }).toEqual(before);
  });
  it('keeps diagnostics when a selected generated model is missing', () => {
    const { inputs, meters } = fixture();
    Object.assign(inputs.analysis.groups[0], { isGeneratedModel: true, selectedModelId: undefined });
    const result = calculateModelingReport(inputs, 2023, meters);
    expect(result.groups[0].critical.length).toBeGreaterThan(0);
    expect(result.charts![0].monthly).toEqual([]);
    expect(result.charts![0].message).toContain('no regression model');
  });
  it('uses the selected generated model coefficients for the chart', () => {
    const { inputs, meters } = fixture();
    const model = structuredClone(calculateModelingReport(inputs, 2023, meters).groups[0].model!);
    Object.assign(model, { modelId: 'selected', isUserDefinedModel: false, modelYear: 2022, coef: [20, 2, 4] });
    Object.assign(inputs.analysis.groups[0], { isGeneratedModel: true, selectedModelId: 'selected', models: [model] });
    const chart = calculateModelingReport(inputs, 2023, meters).charts![0];
    expect(chart.source).toBe('generated');
    expect(chart.monthly[0].modeledEnergy).toBe(120);
    expect(chart.monthly.at(-1)!.modeledEnergy).toBe(156);
  });
  it.each(['energy', 'water'] as const)('ends a partial %s year at the preceding complete year without changing validation', category => {
    const { inputs, meters } = fixture(category);
    const partialMeters = meters.map(meter => ({ ...meter,
      monthlyData: meter.monthlyData.filter(row => row.year < 2024 || row.date.getMonth() < 3) }));
    const partialInputs = { ...inputs, predictorData: inputs.predictorData.filter(row => row.year < 2024 || row.month <= 3) };
    const original = structuredClone({ partialInputs, partialMeters });
    const result = calculateModelingReport(partialInputs, 2024, partialMeters);
    expect(result).toMatchObject({ reportYear: 2024, charts: [{ throughYear: 2023 }] });
    expect(result.charts![0].monthly.at(-1)!.date).toEqual(new Date(2023, 11, 1));
    expect(result.charts![0].monthly[0].energyUse).toBe(category === 'water' ? 100250 : 100.25);
    expect(result.groups).toEqual(calculateAnalysisDataChecks(partialInputs, 2024).groups);
    expect({ partialInputs, partialMeters }).toEqual(original);
  });
  it('bounds the completeness lookup before selecting a year, even when later complete data exists', () => {
    const { inputs, meters } = fixture();
    meters[0].monthlyData = meters[0].monthlyData.filter(row => row.year !== 2023 || row.date.getMonth() < 3);
    const chart = calculateModelingReport(inputs, 2023, meters).charts![0];
    expect(chart.throughYear).toBe(2022);
    expect(chart.monthly).toHaveLength(12);
    expect(calculateModelingReport(inputs, 2024, meters).charts![0].throughYear).toBe(2024);
  });
  it('uses the facility fiscal calendar for both the lookup and the chart endpoint', () => {
    const { inputs, meters } = fixture();
    Object.assign(inputs.facilities[0], { fiscalYear: 'nonCalendarYear', fiscalYearMonth: 6, fiscalYearCalendarEnd: true });
    const chart = calculateModelingReport(inputs, 2025, meters).charts![0];
    expect(chart.throughYear).toBe(2024);
    expect(chart.monthly.at(-1)).toMatchObject({ date: new Date(2024, 5, 1), fiscalYear: 2024 });
  });
  it.each([false, true])('keeps the other Model Details available when no complete year exists in the analysis period (before baseline: %s)', beforeBaseline => {
    const { inputs, meters } = fixture();
    meters[0].monthlyData = meters[0].monthlyData.filter(row => row.year === 2022 && (beforeBaseline || row.date.getMonth() < 3));
    const partialInputs = { ...inputs, predictorData: inputs.predictorData.filter(row => row.year === 2022 && (beforeBaseline || row.month <= 3)) };
    if (beforeBaseline) inputs.analysis.baselineYear = 2023;
    const result = calculateModelingReport(partialInputs, 2024, meters);
    expect(result.groups[0].model).toBeDefined();
    expect(result.charts![0].monthly).toEqual([]);
    expect(result.charts![0].message).toContain('No complete reporting year');
  });
  it('chooses cutoffs independently for groups and preserves genuine zeros', () => {
    const { inputs, meters } = fixture();
    inputs.analysis.groups.push({ ...structuredClone(inputs.analysis.groups[0]), idbGroupId: 'second' });
    meters[0].monthlyData[0].energyUse = 0;
    const other = { ...structuredClone(meters[0]), meter: { ...meters[0].meter, guid: 'other', groupId: 'second' },
      monthlyData: meters[0].monthlyData.filter(row => row.year < 2024) };
    const charts = calculateModelingReport(inputs, 2024, [...meters, other]).charts!;
    expect(charts.map(chart => chart.throughYear)).toEqual([2024, 2023]);
    expect(charts[0].monthly[0].energyUse).toBe(0);
  });
  it('retains banking history while ending the consuming chart at its complete year', () => {
    const { inputs, meters } = fixture(), source = structuredClone(inputs.analysis);
    source.guid = 'banked-analysis';
    Object.assign(inputs.analysis, { hasBanking: true, bankedAnalysisItemId: source.guid });
    Object.assign(inputs.analysis.groups[0], { applyBanking: true, bankedAnalysisYear: 2022, newBaselineYear: 2023 });
    meters[0].monthlyData = meters[0].monthlyData.filter(row => row.year < 2024 || row.date.getMonth() < 3);
    const result = calculateModelingReport({ ...inputs, facilityAnalyses: [inputs.analysis, source] }, 2024, meters);
    expect(result.charts![0].throughYear).toBe(2023);
    expect(result.charts![0].monthly.at(-1)!.date).toEqual(new Date(2023, 11, 1));
    expect(result.charts![0].monthly.some(row => row.fiscalYear === 2022)).toBe(true);
  });
});
