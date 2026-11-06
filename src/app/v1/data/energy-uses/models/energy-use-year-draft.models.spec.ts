import { energyUseFacility, energyUseItem, energyUseSource } from '../energy-uses.testing';
import { energyUseYearChange, nextEnergyUseYear, seedEnergyUseYear } from './energy-use-year-draft.models';
import { energyUseSetup } from './energy-use-setup.models';

const facility = { ...energyUseFacility(), energyUnit: 'kWh' };
const conditions = { year: 2024, hoursOfOperation: 2000, loadFactor: 50, dutyFactor: 80, efficiency: 90, hoursPerDay: 8, daysPerWeek: 5, weeksPerYear: 50 };
const item = energyUseItem({ operatingConditionsData: [conditions] });

describe('Group annual drafts', () => {
  it('chooses the next highest saved fiscal year without clamping overflow', () => {
    const later = energyUseItem({ operatingConditionsData: [{ ...conditions, year: 2027 }] });
    expect(nextEnergyUseYear([item, later], facility)).toBe(2028);
    expect(nextEnergyUseYear([energyUseItem({ operatingConditionsData: [{ ...conditions, year: 9999 }] })], facility)).toBe(10000);
    expect(() => seedEnergyUseYear(item, facility, 10000)).toThrow('1 to 9999');
    expect(() => seedEnergyUseYear(item, facility, 2025.5)).toThrow('1 to 9999');
  });
  it('copies latest inputs and manual amounts without changing the saved record', () => {
    const before = structuredClone(item), draft = seedEnergyUseYear(item, facility, 2025);
    expect(draft).toMatchObject({ existing: false, sourceYear: 2024 });
    expect(draft.value.conditions.at(-1)).toEqual({ ...conditions, year: 2025 });
    expect(draft.value.consumption[0].entries.at(-1)).toMatchObject({ year: 2025, overrideEnergyUse: true, energyUse: 0, energyUseUnit: 'kWh' });
    const change = energyUseYearChange(item, facility, draft.value, 2025);
    expect(change.after?.operatingConditionsData[0]).toEqual(conditions);
    expect(change.after?.utilityData[0].energyUse[0]).toEqual(item.utilityData[0].energyUse[0]);
    expect(change.after?.noLongerInUse).toEqual(item.noLongerInUse);
    expect(item).toEqual(before);
  });
  it('preserves copied calculated amounts until the new inputs change', () => {
    const calculated = energyUseItem({ operatingConditionsData: [conditions], utilityData: [energyUseSource({ energyUse: [{ year: 2024, energyUse: 123, overrideEnergyUse: false, energyUseUnit: 'kWh' }] })] });
    const draft = seedEnergyUseYear(calculated, facility, 2025);
    expect(energyUseYearChange(calculated, facility, draft.value, 2025).after?.utilityData[0].energyUse[1].energyUse).toBe(123);
    const edited = { ...draft.value, conditions: draft.value.conditions.map(row => row.year === 2025 ? { ...row, hoursOfOperation: 4000 } : row) };
    expect(energyUseYearChange(calculated, facility, edited, 2025).after?.utilityData[0].energyUse[1].energyUse).not.toBe(123);
  });
  it('loads destination data rather than replacing it from a newer year', () => {
    const saved = energyUseItem({ operatingConditionsData: [conditions, { ...conditions, year: 2026, loadFactor: 20 }] });
    const draft = seedEnergyUseYear(saved, facility, 2024);
    expect(draft.existing).toBe(true); expect(draft.value.conditions[0].loadFactor).toBe(50);
    const edited = { ...draft.value, conditions: draft.value.conditions.map(row => row.year === 2024 ? { ...row, loadFactor: 70 } : row) };
    const after = energyUseYearChange(saved, facility, edited, 2024).after!;
    expect(after.operatingConditionsData[0].loadFactor).toBe(70);
    expect(after.operatingConditionsData[1]).toEqual(saved.operatingConditionsData[1]);
  });
  it('uses existing defaults for absent history and fills missing latest-year rows', () => {
    const empty = energyUseItem({ utilityData: [energyUseSource({ energyUse: [] })] });
    const value = seedEnergyUseYear(empty, facility, 2025).value;
    expect(value.conditions).toEqual([{ year: 2025, hoursOfOperation: 8760, loadFactor: 100, dutyFactor: 100, efficiency: 100 }]);
    expect(value.consumption[0].entries[0]).toMatchObject({ energyUse: null, overrideEnergyUse: false, energyUseUnit: 'kWh' });
    expect(energyUseYearChange(empty, facility, value, 2025).after?.utilityData[0].energyUse[0].energyUse).toBe(43800);
    const partial = seedEnergyUseYear(energyUseItem(), facility, 2025);
    expect(partial.sourceYear).toBe(2024); expect(partial.value.conditions[0].hoursOfOperation).toBe(8760);
    expect(partial.value.consumption[0].entries.at(-1)?.energyUse).toBe(0);
  });
  it('rejects ambiguous rows and unchanged invalid annual inputs', () => {
    expect(() => seedEnergyUseYear(energyUseItem({ utilityData: [energyUseSource(), energyUseSource()] }), facility, 2025)).toThrow('Repeated');
    expect(() => seedEnergyUseYear(energyUseItem({ operatingConditionsData: [conditions, conditions] }), facility, 2025)).toThrow('Repeated');
    const invalid = energyUseItem({ operatingConditionsData: [{ ...conditions, loadFactor: -1 }] });
    expect(() => energyUseYearChange(invalid, facility, energyUseSetup(invalid), 2024)).toThrow('assumptions');
  });
});
