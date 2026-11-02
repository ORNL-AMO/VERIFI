import { account, calendarizedMeter, meter, monthlyData } from '../facility-meters.testing';
import {
  buildMeterDataColumns,
  buildMeterYearlyDataRows,
  meterDataChartMetrics,
  meterHasLifetimeCost,
  meterMonthlyChartRows,
  meterYearlyChartRows,
  preferredMeterCostMetricId,
  preferredMeterUtilityMetricId
} from './meter-results.models';

describe('meter results models', () => {
  it('shows cost data only when the meter lifetime total is nonzero', () => {
    expect(meterHasLifetimeCost([])).toBe(false);
    expect(meterHasLifetimeCost([{ energyCost: 0 }, { energyCost: 0 }])).toBe(false);
    expect(meterHasLifetimeCost([{ energyCost: 20 }, { energyCost: -20 }])).toBe(false);
    expect(meterHasLifetimeCost([{ energyCost: 0 }, { energyCost: 10 }])).toBe(true);
  });

  it('builds meter table columns, fiscal-year rows, and chart defaults from calendarized meter data', () => {
    const electricMeter = meter({ guid: 'meter-electric', name: 'Electric Main' });
    const calanderizedMeter = calendarizedMeter(electricMeter, [
      monthlyData({
        year: 2025,
        monthNumValue: 11,
        fiscalYear: 2026,
        energyConsumption: 10,
        energyUse: 20,
        energyCost: 30,
        totalWithMarketEmissions: 1
      }),
      monthlyData({
        year: 2026,
        monthNumValue: 0,
        fiscalYear: 2026,
        energyConsumption: 12,
        energyUse: 24,
        energyCost: 36,
        totalWithMarketEmissions: 2
      })
    ], { showElectricalEmissions: true });

    const columns = buildMeterDataColumns(calanderizedMeter, account({ displayEmissions: true }), false, 'Consumption', 'yearly');
    const yearlyRows = buildMeterYearlyDataRows(calanderizedMeter.monthlyData);
    const metrics = meterDataChartMetrics(columns);

    expect(columns.map(column => column.id)).toEqual([
      'year',
      'energyConsumption',
      'energyUse',
      'totalWithMarketEmissions',
      'totalWithLocationEmissions',
      'energyCost'
    ]);
    expect(columns.find(column => column.id === 'energyUse')?.label).toBe('Total Site Energy');
    expect(yearlyRows).toEqual([
      expect.objectContaining({
        year: 2026,
        energyConsumption: 22,
        energyUse: 44,
        energyCost: 66,
        totalWithMarketEmissions: 3
      })
    ]);
    expect(meterMonthlyChartRows(calanderizedMeter.monthlyData)[0]).toMatchObject({
      periodKey: '2025-11',
      periodLabel: 'Dec 2025',
      values: expect.objectContaining({ energyConsumption: 10, energyCost: 30 })
    });
    expect(meterYearlyChartRows(yearlyRows)[0]).toMatchObject({
      periodKey: '2026',
      periodLabel: 'FY 2026',
      values: expect.objectContaining({ energyUse: 44, energyCost: 66 })
    });
    expect(metrics.find(metric => metric.id === 'energyCost')).toMatchObject({ label: 'Total Cost', currency: true });
    expect(preferredMeterUtilityMetricId(columns)).toBe('energyConsumption');
    expect(preferredMeterCostMetricId(columns)).toBe('energyCost');
  });

  it('keeps meter yearly rows split across fiscal-year boundaries', () => {
    const yearlyRows = buildMeterYearlyDataRows([
      monthlyData({ year: 2025, monthNumValue: 11, fiscalYear: 2026, energyConsumption: 10, energyUse: 20, energyCost: 30 }),
      monthlyData({ year: 2026, monthNumValue: 0, fiscalYear: 2026, energyConsumption: 12, energyUse: 24, energyCost: 36 }),
      monthlyData({ year: 2026, monthNumValue: 6, fiscalYear: 2027, energyConsumption: 14, energyUse: 28, energyCost: 42 }),
      monthlyData({ year: 2026, monthNumValue: 7, fiscalYear: 2027, energyConsumption: 0, energyUse: 0, energyCost: 0 })
    ]);

    expect(yearlyRows).toEqual([
      expect.objectContaining({ year: 2026, energyConsumption: 22, energyUse: 44, energyCost: 66 }),
      expect.objectContaining({ year: 2027, energyConsumption: 14, energyUse: 28, energyCost: 42 })
    ]);
    expect(meterYearlyChartRows(yearlyRows).map(row => row.periodLabel)).toEqual(['FY 2026', 'FY 2027']);
  });
});
