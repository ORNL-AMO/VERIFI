import { energyUseFacility, energyUseItem, energyUseSource } from '../energy-uses.testing';
import { reviewEnergyUseBatch } from './energy-use-batch.models';

describe('Reviewed energy use year batches', () => {
  const facility = { ...energyUseFacility(), energyUnit: 'kWh' };
  const item = energyUseItem({ utilityMeterGroupIds: [], operatingConditionsData: [
    { year: 2024, hoursOfOperation: 2000, loadFactor: 50, dutyFactor: 100, efficiency: 100, hoursPerDay: 8, daysPerWeek: 5, weeksPerYear: 50 }
  ], utilityData: [energyUseSource({ energyUse: [{ year: 2024, energyUse: 123, energyUseUnit: 'kWh', overrideEnergyUse: true }] })] });
  it('preserves existing years and rejects incomplete copies on non-skipped items', () => {
    expect(reviewEnergyUseBatch([item], [facility], { kind: 'copy', fromYear: 2020, year: 2024 })[0].skipped).toContain('already exists');
    expect(reviewEnergyUseBatch([item], [facility], { kind: 'copy', fromYear: 2020, year: 2025 })[0].error).toContain('complete');
  });
  it('copies saved amounts, overrides, and calculator inputs independently', () => {
    const review = reviewEnergyUseBatch([item], [facility], { kind: 'copy', fromYear: 2024, year: 2025 })[0];
    expect(review.error).toBeUndefined();
    expect(review.change!.after!.operatingConditionsData[1]).toMatchObject({ year: 2025, hoursPerDay: 8, hoursOfOperation: 2000 });
    expect(review.change!.after!.utilityData[0].energyUse[1]).toEqual({ year: 2025, energyUse: 123, energyUseUnit: 'kWh', overrideEnergyUse: true });
    expect(item.operatingConditionsData).toHaveLength(1);
  });
  it('removes a year while retaining relationships and skips missing years', () => {
    const review = reviewEnergyUseBatch([item], [facility], { kind: 'remove', year: 2024 })[0];
    expect(review.change!.after).toMatchObject({ energyUseGroupId: item.energyUseGroupId, operatingConditionsData: [], utilityData: [expect.objectContaining({ energyUse: [] })] });
    expect(reviewEnergyUseBatch([item], [facility], { kind: 'remove', year: 2020 })[0].skipped).toBeTruthy();
  });
  it('blocks ambiguous imported sources and unavailable owners', () => {
    const duplicate = { ...item, utilityData: [...item.utilityData, structuredClone(item.utilityData[0])] };
    expect(reviewEnergyUseBatch([duplicate], [facility], { kind: 'add', year: 2025 })[0].error).toContain('Repeated');
    expect(reviewEnergyUseBatch([item], [], { kind: 'delete' })[0].error).toContain('facility');
  });
});
