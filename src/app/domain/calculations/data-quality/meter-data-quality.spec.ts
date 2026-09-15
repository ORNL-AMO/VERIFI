import {
  buildMeterDataQualityChartRows,
  buildMeterDataQualityReport,
  calculateStatistics,
  getConsumptionData,
  getDuplicateMeterDataMonths,
  getUnitFromMeter,
  isMeterDataQualityCostIncluded,
  shouldShowMeterDataQualityConsumption
} from './meter-data-quality';
import { meter, reading } from '../../../v1/facility/data/meters/facility-meters.testing';

describe('meter data quality calculations', () => {
  it('calculates v0-parity statistics and outliers with median absolute deviation bounds', () => {
    const stats = calculateStatistics([10, 10, 10, 100]);

    expect(stats.min).toBe(10);
    expect(stats.max).toBe(100);
    expect(stats.average).toBe(32.5);
    expect(stats.median).toBe(10);
    expect(stats.medianAbsDev).toBe(0);
    expect(stats.medianminus2_5MAD).toBe(10);
    expect(stats.medianplus2_5MAD).toBe(10);
    expect(stats.outliers).toBe(1);
  });

  it('ignores NaN, null, undefined, and infinite values while returning empty statistics for no usable values', () => {
    expect(calculateStatistics([1, NaN, null, undefined, Infinity, 3]).average).toBe(2);

    const emptyStats = calculateStatistics([NaN, null, undefined, Infinity]);

    expect(emptyStats.outliers).toBe(0);
    expect(Number.isNaN(emptyStats.average)).toBe(true);
  });

  it('selects consumption values and units from the meter source and scope', () => {
    const electricMeter = meter({ source: 'Electricity', energyUnit: 'kWh', scope: 3 });
    const waterMeter = meter({ source: 'Water Intake', startingUnit: 'gal', energyUnit: 'MMBtu', scope: 5 });
    const fuelMeter = meter({ source: 'Natural Gas', startingUnit: 'therm', energyUnit: 'MMBtu', scope: 1 });
    const rows = [
      reading({ totalEnergyUse: 0, totalVolume: 15 }),
      reading({ guid: 'reading-b', totalEnergyUse: undefined, totalVolume: 20 })
    ];

    expect(getConsumptionData(rows, electricMeter)).toEqual([0, undefined]);
    expect(getConsumptionData(rows, waterMeter)).toEqual([15, 20]);
    expect(getConsumptionData(rows, fuelMeter)).toEqual([15, 20]);
    expect(getUnitFromMeter(waterMeter, rows)).toBe('gal');
    expect(getUnitFromMeter(fuelMeter, rows)).toBe('therm');
  });

  it('suppresses cost display for zero or missing cost data', () => {
    expect(isMeterDataQualityCostIncluded(calculateStatistics([0, 0]))).toBe(false);
    expect(isMeterDataQualityCostIncluded(calculateStatistics([undefined, NaN]))).toBe(false);
    expect(isMeterDataQualityCostIncluded(calculateStatistics([5, 10]))).toBe(true);
  });

  it('hides consumption quality for electricity meters excluded from energy totals', () => {
    expect(shouldShowMeterDataQualityConsumption(meter({ source: 'Electricity', includeInEnergy: false }))).toBe(false);
    expect(shouldShowMeterDataQualityConsumption(meter({ source: 'Electricity', includeInEnergy: true }))).toBe(true);
  });

  it('finds duplicate reading months in chronological order', () => {
    const duplicates = getDuplicateMeterDataMonths([
      reading({ guid: 'reading-a', month: 3, year: 2026 }),
      reading({ guid: 'reading-b', month: 1, year: 2026 }),
      reading({ guid: 'reading-c', month: 3, year: 2026, day: 15 }),
      reading({ guid: 'reading-d', month: 1, year: 2026, day: 2 })
    ]);

    expect(duplicates.map(month => month.monthYear)).toEqual(['Jan 2026', 'Mar 2026']);
    expect(duplicates.map(month => month.count)).toEqual([2, 2]);
  });

  it('builds report state and raw chart rows without mutating input order', () => {
    const selectedMeter = meter({ guid: 'meter-a', source: 'Electricity', energyUnit: 'kWh' });
    const rows = [
      reading({ guid: 'reading-late', month: 2, year: 2026, totalEnergyUse: 10, totalCost: 10 }),
      reading({ guid: 'reading-early', month: 1, year: 2026, totalEnergyUse: 10, totalCost: 10 }),
      reading({ guid: 'reading-outlier', month: 3, year: 2026, totalEnergyUse: 100, totalCost: 100 })
    ];

    const report = buildMeterDataQualityReport(rows, selectedMeter);
    const chartRows = buildMeterDataQualityChartRows(rows, selectedMeter, report.energyStats, report.costStats);

    expect(rows.map(row => row.guid)).toEqual(['reading-late', 'reading-early', 'reading-outlier']);
    expect(chartRows.map(row => row.reading.guid)).toEqual(['reading-early', 'reading-late', 'reading-outlier']);
    expect(report.energyOutlierCount).toBe(1);
    expect(report.costOutlierCount).toBe(1);
    expect(report.showAlert).toBe(true);
  });
});
