import { visualizationSnapshot } from '@app/v1/visualizations/testing/visualization-test-fixtures';
import { calendarizedMeter, meter, monthlyData, reading } from '../../facility-meters.testing';
import { buildMeterDataColumns, meterDataChartMetrics, meterMonthlyChartRows } from '../../models';
import { captureMonthlyMeter, MonthlyMeterCaptureInput } from './monthly-meter-visualization-capture';
import { resolveCalendarizedUtility } from '@domain/visualizations/utility/utility-calendarized';
import { utilityCapabilities, utilityChartSupport } from '@domain/visualizations/utility/utility-capabilities';
import { prepareMonthlyPatterns } from '@app/v1/visualizations/monthly-patterns/monthly-patterns.presenter';

describe('monthly meter capture fidelity', () => {
  function setup(metricId = 'energyUse'): MonthlyMeterCaptureInput {
    const original = visualizationSnapshot(), selected = meter({ name: 'Electricity', meterReadingDataApplication: 'fullMonth' });
    const snapshot = { ...original, facilities: original.facilities.map(f => ({ ...f, name: 'HQ (Simple)', energyUnit: 'kWh', energyIsSource: false })),
      meters: [selected], meterData: [reading({ totalEnergyUse: 0, totalCost: 20 })] };
    const projectedMeter = calendarizedMeter(selected, [monthlyData({ energyUse: 0, energyConsumption: 0, energyCost: 20 })], { energyUnit: 'kWh', consumptionUnit: 'kWh', energyIsSource: false });
    return { snapshot, facilityGuid: selected.facilityId, meterGuid: selected.guid, projectedMeter,
      rows: meterMonthlyChartRows(projectedMeter.monthlyData), metrics: meterDataChartMetrics(buildMeterDataColumns(projectedMeter, snapshot.account, false, 'Consumption')),
      presentation: { leftMetricId: metricId, rightMetricId: 'energyCost', leftDisplay: 'bar', rightDisplay: 'line', leftTraceType: 'bar', rightTraceType: 'line',
        hiddenMetricIds: [], zoom: { start: 30, end: 60 }, smoothLines: true, legend: true }, workspaceRevision: 1, calendarDate: '2026-11-18' };
  }

  it.each([false, true])('captures fiscal patterns, aligned months, zeros, gaps and optional cost (fiscal=%s)', nonCalendar => {
    const base = setup();
    const month = nonCalendar ? 6 : 0;
    const input = { ...base, snapshot: { ...base.snapshot, facilities: base.snapshot.facilities.map(f => ({ ...f, fiscalYear: nonCalendar ? 'nonCalendarYear' as const : 'calendarYear' as const, fiscalYearMonth: month, fiscalYearCalendarEnd: true })),
      meterData: base.snapshot.meterData.map(row => ({ ...row, month: month + 1, date: new Date(2026, month, 1) })) },
      projectedMeter: { ...base.projectedMeter, monthlyData: [monthlyData({ year: 2026, fiscalYear: nonCalendar ? 2027 : 2026, monthNumValue: month, energyUse: 0, energyCost: 20 })] },
      presentation: { ...base.presentation, leftDisplay: 'line' as const, leftTraceType: 'line' as const, smoothLines: false }, patterns: { hiddenYears: [] } };
    input.rows = meterMonthlyChartRows(input.projectedMeter.monthlyData);
    const result = captureMonthlyMeter(input);
    if (result.state !== 'supported') throw new Error(result.reasons.join(' '));
    expect(result.definition.name).toBe('HQ (Simple) - Monthly Patterns Electricity');
    expect(result.definition.chart).toMatchObject({ kind: 'monthly-patterns', smoothLines: false });
    const evidence = result.definition.sources.map(source => {
      const request = { identity: { accountGuid: 'account-a', scope: { kind: 'facility' as const, facilityGuid: 'facility-a', facilityGuids: ['facility-a'] }, workspaceRevision: 1, definitionGuid: 'test', definitionRevision: 1, requestId: 'test', sourceId: source.id },
        source, chart: result.definition.chart!, period: result.definition.period, comparison: result.definition.comparison, series: result.definition.series.filter(series => series.sourceId === source.id), dateContext: { calendarDate: '2026-11-18' } };
      if (source.kind !== 'utility') throw new Error('Expected utility');
      return { request, capabilities: utilityCapabilities(source), chartSupport: utilityChartSupport(source, request.chart), resolution: resolveCalendarizedUtility(input.snapshot, request, [input.projectedMeter]) };
    });
    const model = prepareMonthlyPatterns(result.definition, evidence);
    expect(model.months[0]).toBe(nonCalendar ? 'Jul' : 'Jan');
    expect(model.years.map(year => year.label)).toEqual([nonCalendar ? 'FY 2027' : '2026']);
    expect(model.panels).toHaveLength(2); expect(model.panels[0].years[0].points[0].observation).toMatchObject({ state: 'observed', value: 0 });
    expect(model.panels[0].years[0].points[1].observation.state).toBe('alignment-padding');
    expect(captureMonthlyMeter({ ...input, patterns: { hiddenYears: model.years.map(year => year.year) } }).state).toBe('unsupported');
  });

  it.each(['energyUse', 'energyConsumption'])('captures %s and cost with pinned settings, styles, true zero and all-history intent', metricId => {
    const input = setup(metricId), before = structuredClone(input), result = captureMonthlyMeter(input);
    if (result.state !== 'supported') throw new Error(result.reasons.join(' '));
    expect(result.definition.name).toBe('HQ (Simple) - Monthly Electricity');
    expect(result.definition.facilitySelection).toEqual({ kind: 'fixed', facilityGuids: ['facility-a'] });
    expect(result.definition.sources).toHaveLength(2);
    expect(result.definition.sources[0]).toMatchObject({ selectionMode: 'meter', selection: { kind: 'fixed', resource: 'meter', guids: ['meter-a'] },
      aggregation: 'none', dataMode: 'calendarized', settings: { unit: { kind: 'pinned', value: 'kWh' } } });
    if (metricId === 'energyUse') expect(result.definition.sources[0].settings?.energyTreatment).toEqual({ kind: 'pinned', value: 'site' });
    expect(result.definition.series).toEqual([
      expect.objectContaining({ axis: 'left', traceType: 'bar', color: 'var(--v1-chart-series-1)', visible: true }),
      expect.objectContaining({ axis: 'right', traceType: 'line', label: 'Total Cost', color: 'var(--v1-chart-series-3)', visible: true })
    ]);
    expect(result.definition.period).toEqual({ kind: 'all-history' });
    expect(result.definition.chart).toMatchObject({ smoothLines: true, interval: 'monthly', stack: 'none' });
    expect(JSON.stringify(result.definition)).not.toContain('zoom'); expect(input).toEqual(before);
  });

  it('retains hidden configured items and their last trace type, including legend visibility', () => {
    const input = setup();
    const result = captureMonthlyMeter({ ...input, presentation: { ...input.presentation, leftDisplay: 'off', leftTraceType: 'bar', legend: false } });
    if (result.state !== 'supported') throw new Error(result.reasons.join(' '));
    expect(result.definition.series[0]).toMatchObject({ visible: false, traceType: 'bar' });
    expect(result.definition.appearance.legend).toBe(false);
    const legendHidden = captureMonthlyMeter({ ...input, presentation: { ...input.presentation, hiddenMetricIds: ['energyCost'] } });
    expect(legendHidden.state === 'supported' && legendHidden.definition.series[1].visible).toBe(false);
    expect(captureMonthlyMeter({ ...input, presentation: { ...input.presentation, leftDisplay: 'off', rightDisplay: 'off' } }).state).toBe('unsupported');
  });

  it('omits suppressed cost and captures water without inventing energy meaning', () => {
    const input = setup('energyConsumption'), selected = { ...input.snapshot.meters[0], source: 'Water Intake' as const, startingUnit: 'gal' };
    const water = { ...input, snapshot: { ...input.snapshot, meters: [selected], meterData: [reading({ totalVolume: 10 })] },
      projectedMeter: { ...input.projectedMeter, meter: selected, consumptionUnit: 'gal' },
      metrics: input.metrics.map(m => m.id === 'energyConsumption' ? { ...m, unit: 'gal' } : m),
      presentation: { ...input.presentation, rightMetricId: undefined } };
    water.projectedMeter = { ...water.projectedMeter, monthlyData: water.projectedMeter.monthlyData.map(row => ({ ...row, energyConsumption: 10 })) };
    water.rows = meterMonthlyChartRows(water.projectedMeter.monthlyData);
    const result = captureMonthlyMeter(water);
    if (result.state !== 'supported') throw new Error(result.reasons.join(' '));
    expect(result.definition.sources).toHaveLength(1);
    expect(result.definition.sources[0]).toMatchObject({ measure: 'consumption', settings: { unit: { value: 'gal' } } });
  });

  it('blocks unsupported measures, changed ownership, values, coverage, normalized zeros and estimated quality', () => {
    const input = setup();
    expect(captureMonthlyMeter({ ...input, meterGuid: 'missing' }).state).toBe('unsupported');
    expect(captureMonthlyMeter({ ...input, presentation: { ...input.presentation, leftMetricId: 'RECs' } }).state).toBe('unsupported');
    expect(captureMonthlyMeter({ ...input, rows: input.rows.map(row => ({ ...row, values: { ...row.values, energyUse: 99 } })) }).state).toBe('unsupported');
    expect(captureMonthlyMeter({ ...input, rows: [...input.rows, { ...input.rows[0], periodKey: '2026-1' }] }).state).toBe('unsupported');
    for (const changed of [{ totalCost: undefined }, { isEstimated: true }]) {
      expect(captureMonthlyMeter({ ...input, snapshot: { ...input.snapshot, meterData: input.snapshot.meterData.map(bill => ({ ...bill, ...changed })) } }).state).toBe('unsupported');
    }
  });
});
