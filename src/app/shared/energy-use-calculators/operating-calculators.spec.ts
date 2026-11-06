import { calculateLoadFactor, calculateOperatingHours, LoadFactorInputs } from './operating-calculators';
import { RatedPowerCalculator } from './rated-power-calculator';

describe('Energy use calculators', () => {
  it('retains operating-hours limits, ceiling and valid zeroes', () => {
    expect(calculateOperatingHours(24, 7, 52)).toBe(8736);
    expect(calculateOperatingHours(1.1, 1, 1)).toBe(2);
    expect(calculateOperatingHours(0, 7, 52)).toBe(0);
    for (const invalid of [null, NaN, Infinity, -1, 25]) expect(calculateOperatingHours(invalid, 7, 52)).toBeNull();
  });
  const load: LoadFactorInputs = { method: 'measuredPower', ratedPower: 10, ratedPowerUnit: 'kW', measuredPower: 5,
    measuredPowerUnit: 'kW', voltage: 1000, current: 5, phases: 1, powerFactor: 1 };
  it('calculates either load-factor method, converts units and caps at 115%', () => {
    expect(calculateLoadFactor(load)).toEqual({ percent: 50, applied: 50 });
    expect(calculateLoadFactor({ ...load, method: 'voltageCurrent' })).toEqual({ percent: 50, applied: 50 });
    expect(calculateLoadFactor({ ...load, measuredPower: 20 })).toEqual({ percent: 200, applied: 115 });
    expect(calculateLoadFactor({ ...load, measuredPower: 0 })?.applied).toBe(0);
    expect(calculateLoadFactor({ ...load, ratedPower: 0 })).toBeNull();
    expect(calculateLoadFactor({ ...load, ratedPowerUnit: 'invalid' })).toBeNull();
    expect(calculateLoadFactor({ ...load, method: 'voltageCurrent', powerFactor: 2 })).toBeNull();
    expect(calculateLoadFactor({ ...load, ratedPower: 1, ratedPowerUnit: 'hp', measuredPower: 0.7457 })?.applied).toBeCloseTo(100, 0);
  });
  it('uses the same natural-gas conversion as the legacy rated-power calculator', () => {
    const calculator = new RatedPowerCalculator(); calculator.energySource = 'Natural Gas'; calculator.initialPowerUnit = 'MMBtuhr'; calculator.initialize();
    calculator.ratedCapacity = 1000;
    expect(calculator.isDisabled).toBe(false); expect(calculator.calculatedRatedPower).toBeCloseTo(1.029, 6);
    calculator.changePhysicalUnit('CCF'); calculator.ratedCapacity = 10;
    expect(calculator.calculatedRatedPower).toBeCloseTo(1.029, 6);
    calculator.updateHeatCapacity(''); expect(calculator.isDisabled).toBe(true);
  });
});
