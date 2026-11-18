import { visualizationSnapshot } from '@app/v1/visualizations/testing/visualization-test-fixtures';
import { calendarizedMeter, meter, monthlyData, reading } from '../../facility-meters.testing';
import { buildMeterDataColumns, meterDataChartMetrics, meterMonthlyChartRows } from '../../models';
import { captureMonthlyMeter, MonthlyMeterCaptureInput } from './monthly-meter-visualization-capture';

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
