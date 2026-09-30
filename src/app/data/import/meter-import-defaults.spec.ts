import { applyMeterMultipliers, getDefaultMeterScope } from './meter-import-defaults';

describe('meter import defaults', () => {
  it('preserves the legacy default scope mapping', () => {
    expect(getDefaultMeterScope('Electricity')).toBe(3);
    expect(getDefaultMeterScope('Natural Gas')).toBe(1);
    expect(getDefaultMeterScope('Other Energy')).toBe(4);
    expect(getDefaultMeterScope('Other')).toBe(100);
  });

  it('sets electricity REC, market, and location multipliers', () => {
    const meter = applyMeterMultipliers({
      source: 'Electricity', agreementType: 5, greenPurchaseFraction: .25,
      retainRECs: false, directConnection: false, includeInEnergy: true
    } as any);
    expect(meter.recsMultiplier).toBe(.25);
    expect(meter.marketGHGMultiplier).toBe(.75);
    expect(meter.locationGHGMultiplier).toBe(1);
  });
});
