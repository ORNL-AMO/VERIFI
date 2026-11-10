import { calculateUserDefinedInspection } from './user-defined-inspection-calculation';
import { userDefinedInspectionFixture } from './testing/user-defined-inspection.fixture';
import { buildUserDefinedRegressionModel } from '@shared/shared-analysis/calculations/regression-models-calculation';

describe('User-defined inspection chart coverage', () => {
  it('includes a pre-baseline model period without changing saved inputs or SEP baseline validation', () => {
    const request = userDefinedInspectionFixture();
    const original = structuredClone(request);
    const result = calculateUserDefinedInspection(request);
    const modelPoints = result.chartData!.filter(point => point.date.getFullYear() === 2023);
    expect(modelPoints).toHaveLength(12);
    expect(modelPoints.every(point => point.energyUse === 100 && point.modeledEnergy === 21)).toBe(true);
    expect(result.chartData).toHaveLength(36);
    expect(result.chartData!.filter(point => point.date.getFullYear() >= 2024).every(point => point.modeledEnergy === 41)).toBe(true);
    expect(request).toEqual(original);
    const validation = buildUserDefinedRegressionModel(request.selectedGroup, request.facility, request.analysisItem,
      2025, request.accountPredictorEntries);
    expect(validation.SEPValidation[0].meanBaselineYear).toBe(20);
  });

  it('fills only missing selected months across a fiscal baseline without duplicate points', () => {
    const request = userDefinedInspectionFixture();
    request.facility.fiscalYear = 'nonCalendarYear';
    request.facility.fiscalYearMonth = 6;
    const result = calculateUserDefinedInspection(request).chartData!;
    expect(result.filter(point => point.date.getFullYear() === 2023)).toHaveLength(12);
    expect(result).toHaveLength(30);
    expect(new Set(result.map(point => point.date.getTime())).size).toBe(result.length);
    expect(result[0].date).toEqual(new Date(2023, 0, 1));
    expect(result.at(-1)!.date).toEqual(new Date(2025, 5, 1));
  });

  it('retains chronological analysis history without filling unrelated years between it and the selected period', () => {
    const request = userDefinedInspectionFixture();
    request.analysisItem.baselineYear = 2025;
    const result = calculateUserDefinedInspection(request).chartData!;
    expect(result).toHaveLength(24);
    expect(result.some(point => point.date.getFullYear() === 2024)).toBe(false);
    expect(result.map(point => point.date.getTime())).toEqual(result.map(point => point.date.getTime()).sort((a, b) => a - b));
  });

  it('does not duplicate an in-baseline model period', () => {
    const request = userDefinedInspectionFixture();
    request.selectedGroup.regressionStartYear = request.selectedGroup.regressionEndYear = 2024;
    const result = calculateUserDefinedInspection(request).chartData!;
    expect(result).toHaveLength(24);
    expect(result[0]).toEqual({ date: new Date(2024, 0, 1), energyUse: 100, modeledEnergy: 41 });
  });

  it('uses all matching predictor contributions, excludes other groups, and retains precision', () => {
    const request = userDefinedInspectionFixture();
    request.selectedGroup.regressionConstant = 0.1234567;
    request.selectedGroup.predictorVariables[0].regressionCoefficient = 0.23456789;
    request.accountPredictorEntries.push({ ...request.accountPredictorEntries[0], guid: 'extra-reading', amount: 5 });
    request.meters.push({ ...request.meters[0], guid: 'other-meter', groupId: 'other-group' });
    request.meterData.push({ ...request.meterData[0], guid: 'other-bill', meterId: 'other-meter', totalEnergyUse: 999 });
    const point = calculateUserDefinedInspection(request).chartData![0];
    expect(point.energyUse).toBe(100);
    expect(point.modeledEnergy).toBe(15 * 0.23456789 + 0.1234567);
  });

  it('uses water consumption and the existing nonnegative modeled-value boundary', () => {
    const request = userDefinedInspectionFixture();
    request.analysisItem.analysisCategory = 'water';
    request.analysisItem.waterUnit = 'gal';
    request.meters[0].source = 'Water Intake';
    request.meters[0].startingUnit = 'gal';
    request.meters[0].includeInEnergy = false;
    request.meterData.forEach(row => row.totalVolume = 75);
    request.selectedGroup.regressionConstant = -100;
    const result = calculateUserDefinedInspection(request).chartData!;
    expect(result[0]).toEqual({ date: new Date(2023, 0, 1), energyUse: 75, modeledEnergy: 0 });
    expect(result.find(point => point.date.getFullYear() === 2024)!.modeledEnergy).toBe(0);
  });
});
