import { energyUseFacility, energyUseItem, energyUseSource } from '../energy-uses.testing';
import { addEnergyUseYear, applyEnergyUseSetup, energyUseSetup, energyUseSetupError, estimateEnergyUse, reconcileEnergyUseSetup, removeEnergyUseYear, reviewEnergyUseYear } from './energy-use-setup.models';

describe('Energy Use combined setup', () => {
  const facility = { ...energyUseFacility(), energyUnit: 'kWh' };
  function item() {
    return energyUseItem({ utilityMeterGroupIds: [], operatingConditionsData: [{ year: 2024, hoursOfOperation: 1000, loadFactor: 50, dutyFactor: 80, efficiency: 80, hoursPerDay: 8 }],
      utilityData: [energyUseSource({ energyUse: [{ year: 2024, energyUse: 123, overrideEnergyUse: false, energyUseUnit: 'kWh' }] }),
        energyUseSource({ energySource: 'Natural Gas', energyUse: [{ year: 2024, energyUse: 0, overrideEnergyUse: true, energyUseUnit: 'GJ' }] })] });
  }
  it('does not hydrate derived amounts into editable state or rewrite history for metadata', () => {
    const current = item(), base = energyUseSetup(current);
    expect(base.consumption[0].entries[0].energyUse).toBeNull();
    const saved = applyEnergyUseSetup(current, { ...base, name: 'Renamed' }, facility);
    expect(saved.utilityData).toEqual(current.utilityData);
    expect(saved.operatingConditionsData).toStrictEqual(current.operatingConditionsData);
    expect(current.name).toBe('Pump A');
  });
  it('calculates changed assumptions and source capacity together while retaining manual zeroes', () => {
    const current = item(), base = energyUseSetup(current);
    const value = { ...base, sources: base.sources.map(source => ({ ...source, size: 10 })), conditions: base.conditions.map(row => ({ ...row, hoursOfOperation: 2000 })) };
    const saved = applyEnergyUseSetup(current, value, facility);
    expect(saved.utilityData[0].energyUse[0].energyUse).toBe(10000);
    expect(saved.utilityData[1].energyUse[0]).toEqual(current.utilityData[1].energyUse[0]);
    expect(saved.operatingConditionsData[0].hoursPerDay).toBe(8);
  });
  it('removes explicitly cleared calculator inputs while preserving unknown operating metadata', () => {
    const current = item(); Object.assign(current.operatingConditionsData[0], { importedCalculation: { note: 'Preserve' } });
    const base = energyUseSetup(current), value = { ...base, conditions: base.conditions.map(({ hoursPerDay, ...row }) => row) };
    const saved = applyEnergyUseSetup(current, value, facility);
    expect(Object.hasOwn(saved.operatingConditionsData[0], 'hoursPerDay')).toBe(false);
    expect(saved.operatingConditionsData[0]).toMatchObject({ importedCalculation: { note: 'Preserve' } });
  });
  it.each([
    ['Electricity', 'kWh', 2500], ['Natural Gas', 'kWh', 2000], ['Electricity', 'MWh', 2.5]
  ] as const)('uses existing %s formula and %s conversion precision', (source, unit, expected) => {
    expect(estimateEnergyUse(energyUseSetup(item()), source, 2024, unit)).toBe(expected);
  });
  it('supports valid zero hours, blocks zero electricity efficiency and non-finite estimates', () => {
    const base = energyUseSetup(item());
    expect(estimateEnergyUse({ ...base, conditions: base.conditions.map(row => ({ ...row, hoursOfOperation: 0 })) }, 'Electricity', 2024, 'kWh')).toBe(0);
    expect(energyUseSetupError({ ...base, conditions: base.conditions.map(row => ({ ...row, efficiency: 0 })) }, base)).toContain('2024');
    expect(() => estimateEnergyUse({ ...base, sources: base.sources.map(row => ({ ...row, size: Number.MAX_VALUE })) }, 'Electricity', 2024, 'kWh')).toThrow();
  });
  it('adds all sources without meter readings and copies saved amounts, units and overrides independently', () => {
    const current = item(), base = energyUseSetup(current);
    const added = applyEnergyUseSetup(current, addEnergyUseYear(base, 2026, facility), facility);
    expect(added.operatingConditionsData).toHaveLength(2);
    expect(added.utilityData.every(source => source.energyUse.some(row => row.year === 2026 && !row.overrideEnergyUse))).toBe(true);
    const copied = applyEnergyUseSetup(current, addEnergyUseYear(base, 2025, facility, { year: 2024, item: current }), facility);
    expect(copied.utilityData[0].energyUse[1]).toEqual({ ...current.utilityData[0].energyUse[0], year: 2025 });
    expect(copied.utilityData[1].energyUse[1]).toEqual({ ...current.utilityData[1].energyUse[0], year: 2025 });
    copied.utilityData[0].energyUse[1].energyUse = 999;
    expect(current.utilityData[0].energyUse[0].energyUse).toBe(123);
  });
  it('recalculates copied consumption after editing copied assumptions', () => {
    const current = item(), copied = addEnergyUseYear(energyUseSetup(current), 2025, facility, { year: 2024, item: current });
    const changed = { ...copied, conditions: copied.conditions.map(row => row.year === 2025 ? { ...row, hoursOfOperation: 2000 } : row) };
    expect(applyEnergyUseSetup(current, changed, facility).utilityData[0].energyUse[1].energyUse).toBe(5000);
  });
  it('copies pending assumptions and their displayed calculation as one coherent snapshot', () => {
    const current = item(), base = energyUseSetup(current);
    const pending = { ...base, conditions: base.conditions.map(row => ({ ...row, hoursOfOperation: 2000 })) };
    const copied = addEnergyUseYear(pending, 2025, facility, { year: 2024, item: current });
    const saved = applyEnergyUseSetup(current, copied, facility);
    expect(saved.utilityData[0].energyUse.map(row => row.energyUse)).toEqual([5000, 5000]);
    expect(saved.utilityData[1].energyUse.map(row => row.energyUse)).toEqual([0, 0]);
    const copiedAgain = addEnergyUseYear(copied, 2026, facility, { year: 2025, item: current });
    expect(applyEnergyUseSetup(current, copiedAgain, facility).utilityData[0].energyUse[2].energyUse).toBe(5000);
  });
  it('uses pending capacity and units when copying and invalidates copied amounts after unit changes', () => {
    const current = item(), base = energyUseSetup(current);
    const pending = { ...base, sources: base.sources.map(row => ({ ...row, size: 10 })), consumption: base.consumption.map(source => ({ ...source,
      entries: source.entries.map(row => ({ ...row, energyUseUnit: 'MWh' })) })) };
    const copied = addEnergyUseYear(pending, 2025, facility, { year: 2024, item: current });
    expect(applyEnergyUseSetup(current, copied, facility).utilityData[0].energyUse.map(row => row.energyUse)).toEqual([5, 5]);
    const changed = { ...copied, consumption: copied.consumption.map(source => ({ ...source,
      entries: source.entries.map(row => row.year === 2025 ? { ...row, energyUseUnit: 'kWh' } : row) })) };
    expect(applyEnergyUseSetup(current, changed, facility).utilityData[0].energyUse[1].energyUse).toBe(5000);
  });
  it('rejects duplicate target years and sparse or ambiguous copies without changing data', () => {
    const current = item(), base = energyUseSetup(current);
    expect(() => addEnergyUseYear(base, 2024, facility)).toThrow('already exists');
    expect(() => addEnergyUseYear(base, 0, facility)).toThrow('1 to 9999');
    expect(() => addEnergyUseYear({ ...base, consumption: base.consumption.map(row => ({ ...row, entries: [] })) }, 2025, facility, { year: 2024, item: current })).toThrow('missing');
    expect(() => addEnergyUseYear({ ...base, sources: [...base.sources, base.sources[0]] }, 2025, facility)).toThrow('Repeated');
  });
  it('uses the source review when removing history that belongs only to the removed source', () => {
    const current = energyUseItem({ operatingConditionsData: [], utilityMeterGroupIds: [] }), base = energyUseSetup(current);
    const value = { ...base, sources: [], consumption: [] };
    expect(() => applyEnergyUseSetup(current, value, facility)).toThrow('Review the source removal');
    const saved = applyEnergyUseSetup(current, value, facility, { sources: structuredClone(current.utilityData) });
    expect(saved.utilityData).toEqual([]);
  });
  it('requires current removal review and permits removing the final year', () => {
    const current = item(), base = energyUseSetup(current), value = removeEnergyUseYear(base, 2024), review = reviewEnergyUseYear(current, 2024);
    expect(() => applyEnergyUseSetup(current, value, facility)).toThrow('Review');
    const saved = applyEnergyUseSetup(current, value, facility, { years: [review] });
    expect(saved.operatingConditionsData).toEqual([]); expect(saved.utilityData.every(source => !source.energyUse.length)).toBe(true);
    current.utilityData[0].energyUse[0].energyUse = 456;
    expect(() => applyEnergyUseSetup(current, value, facility, { years: [review] })).toThrow('changed');
  });
  it('merges independent annual fields and sources while surfacing coupled override conflicts', () => {
    const base = energyUseSetup(item());
    const local = { ...base, conditions: base.conditions.map(row => ({ ...row, hoursOfOperation: 2000 })) };
    const saved = { ...base, notes: 'Elsewhere', conditions: base.conditions.map(row => ({ ...row, dutyFactor: 40 })) };
    const merged = reconcileEnergyUseSetup(base, local, saved);
    expect(merged.conflicts).toEqual([]);
    expect(merged.value).toMatchObject({ notes: 'Elsewhere', conditions: [{ hoursOfOperation: 2000, dutyFactor: 40 }] });
    const mine = { ...base, consumption: base.consumption.map(row => row.energySource === 'Natural Gas' ? { ...row, entries: row.entries.map(entry => ({ ...entry, energyUse: 10 })) } : row) };
    const theirs = { ...base, consumption: base.consumption.map(row => row.energySource === 'Natural Gas' ? { ...row, entries: row.entries.map(entry => ({ ...entry, energyUseUnit: 'kWh' })) } : row) };
    expect(reconcileEnergyUseSetup(base, mine, theirs).conflicts).toHaveLength(1);
  });
  it('preserves duplicate and sparse imported data during unrelated metadata edits', () => {
    const current = item();
    current.utilityData.push(structuredClone(current.utilityData[0]));
    current.utilityData[0].energyUse.push({ year: 2020, energyUse: 47, energyUseUnit: 'legacy', overrideEnergyUse: false });
    current.operatingConditionsData.push(structuredClone(current.operatingConditionsData[0]));
    const base = energyUseSetup(current), value = { ...base, name: 'Metadata only' };
    const merged = reconcileEnergyUseSetup(base, value, base);
    expect(merged.conflicts).toEqual([]);
    expect(applyEnergyUseSetup(current, merged.value, facility).utilityData).toEqual(current.utilityData);
    expect(applyEnergyUseSetup(current, merged.value, facility).operatingConditionsData).toEqual(current.operatingConditionsData);
  });
  it('edits and merges unique years beside untouched duplicate operating years', () => {
    const current = item();
    current.operatingConditionsData.push({ ...current.operatingConditionsData[0], hoursOfOperation: -1 }, { ...current.operatingConditionsData[0], year: 2025 });
    current.utilityData.forEach(source => source.energyUse.push({ ...source.energyUse[0], year: 2025 }));
    const base = energyUseSetup(current), local = { ...base, conditions: base.conditions.map(row => row.year === 2025 ? { ...row, hoursOfOperation: 2000 } : row) };
    const remote = { ...base, notes: 'Elsewhere', conditions: base.conditions.map(row => row.year === 2025 ? { ...row, dutyFactor: 40 } : row) };
    const merged = reconcileEnergyUseSetup(base, local, remote);
    expect(merged.conflicts).toEqual([]);
    expect(energyUseSetupError(merged.value, base)).toBeUndefined();
    const saved = applyEnergyUseSetup(current, merged.value, facility);
    expect(saved.operatingConditionsData.slice(0, 2)).toEqual(current.operatingConditionsData.slice(0, 2));
    expect(saved.operatingConditionsData[2]).toMatchObject({ hoursOfOperation: 2000, dutyFactor: 40 });
    expect(saved.utilityData[0].energyUse[1].energyUse).toBe(2500);
    expect(() => applyEnergyUseSetup(current, { ...base, conditions: base.conditions.slice(1) }, facility)).toThrow('Repeated operating years');
  });
  it('preserves distinct duplicate consumption rows while editing another year', () => {
    const current = item();
    current.operatingConditionsData.push({ ...current.operatingConditionsData[0], year: 2025 });
    current.utilityData[0].energyUse.push({ ...current.utilityData[0].energyUse[0], energyUse: 456 }, { ...current.utilityData[0].energyUse[0], year: 2025 });
    const base = energyUseSetup(current), value = { ...base, conditions: base.conditions.map(row => row.year === 2025 ? { ...row, hoursOfOperation: 2000 } : row) };
    const saved = applyEnergyUseSetup(current, value, facility);
    expect(saved.utilityData[0].energyUse.slice(0, 2)).toEqual(current.utilityData[0].energyUse.slice(0, 2));
    expect(saved.utilityData[0].energyUse[2].energyUse).toBe(5000);
    expect(() => applyEnergyUseSetup(current, { ...base, sources: base.sources.map(row => ({ ...row, size: 10 })) }, facility)).toThrow('Repeated Electricity entries');
  });
  it('allows independent source edits beside unchanged duplicate sources', () => {
    const current = item(); current.utilityData.push(structuredClone(current.utilityData[0]));
    const base = energyUseSetup(current), value = { ...base, consumption: base.consumption.map(source => source.energySource === 'Natural Gas'
      ? { ...source, entries: source.entries.map(row => ({ ...row, energyUse: 42 })) } : source) };
    const saved = applyEnergyUseSetup(current, value, facility);
    expect(saved.utilityData[0]).toEqual(current.utilityData[0]); expect(saved.utilityData[2]).toEqual(current.utilityData[2]);
    expect(saved.utilityData[1].energyUse[0].energyUse).toBe(42);
  });
  it('conflicts when a saved year disappears while local assumptions are edited', () => {
    const base = energyUseSetup(item()), local = { ...base, conditions: base.conditions.map(row => ({ ...row, hoursOfOperation: 2000 })) };
    const saved = removeEnergyUseYear(base, 2024), result = reconcileEnergyUseSetup(base, local, saved);
    expect(result.conflicts.some(conflict => conflict.id === 'removed-year.2024')).toBe(true);
  });
  it('retains the complete removed-year draft across publications and resolves its supported deletion choice once', () => {
    const base = energyUseSetup(item()), local = { ...base, name: 'Mine', conditions: base.conditions.map(row => ({ ...row, hoursOfOperation: 2000 })) };
    const saved = removeEnergyUseYear(base, 2024), first = reconcileEnergyUseSetup(base, local, saved);
    expect(first.conflicts).toEqual([expect.objectContaining({ id: 'removed-year.2024', allowedChoices: ['saved'] })]);
    expect(first.value.consumption).toEqual(local.consumption);
    const nextSaved = { ...saved, notes: 'Elsewhere' }, second = reconcileEnergyUseSetup(first.baseline!, first.value, nextSaved);
    expect(second.conflicts).toEqual(first.conflicts); expect(second.value.consumption).toEqual(local.consumption);
    const resolved = reconcileEnergyUseSetup(second.baseline!, second.value, nextSaved, { 'removed-year.2024': 'saved' });
    expect(resolved.conflicts).toEqual([]); expect(resolved.value).toMatchObject({ name: 'Mine', notes: 'Elsewhere', conditions: [] });
    expect(resolved.value.consumption.every(source => !source.entries.length)).toBe(true);
    expect(reconcileEnergyUseSetup(resolved.baseline!, resolved.value, nextSaved).conflicts).toEqual([]);
  });
  it('retains a removed source and its coupled configuration until accepting saved deletion', () => {
    const base = energyUseSetup(item()), local = { ...base, consumption: base.consumption.map(source => source.energySource === 'Natural Gas'
      ? { ...source, entries: source.entries.map(row => ({ ...row, energyUse: 42 })) } : source) };
    const saved = { ...base, sources: base.sources.filter(source => source.energySource !== 'Natural Gas'), consumption: base.consumption.filter(source => source.energySource !== 'Natural Gas') };
    const first = reconcileEnergyUseSetup(base, local, saved);
    expect(first.conflicts).toEqual([expect.objectContaining({ id: 'removed-sources', allowedChoices: ['saved'] })]);
    expect(first.value.sources).toEqual(local.sources); expect(first.value.consumption).toEqual(local.consumption);
    const second = reconcileEnergyUseSetup(first.baseline!, first.value, { ...saved, notes: 'Elsewhere' });
    expect(second.conflicts).toEqual(first.conflicts);
    const resolved = reconcileEnergyUseSetup(second.baseline!, second.value, saved, { 'removed-sources': 'saved' });
    expect(resolved.conflicts).toEqual([]); expect(resolved.value.sources).toEqual(saved.sources); expect(resolved.value.consumption).toEqual(saved.consumption);
  });
  it('keeps manual amounts unchanged when changing their unit and rejects invalid amounts', () => {
    const current = item(), base = energyUseSetup(current);
    const value = { ...base, consumption: base.consumption.map(row => row.energySource === 'Natural Gas' ? { ...row, entries: row.entries.map(entry => ({ ...entry, energyUse: 22, energyUseUnit: 'kWh' })) } : row) };
    expect(applyEnergyUseSetup(current, value, facility).utilityData[1].energyUse[0]).toMatchObject({ energyUse: 22, energyUseUnit: 'kWh', overrideEnergyUse: true });
    const invalid = { ...value, consumption: value.consumption.map(row => ({ ...row, entries: row.entries.map(entry => ({ ...entry, overrideEnergyUse: true, energyUse: NaN })) })) };
    expect(energyUseSetupError(invalid, base)).toContain('finite');
  });
});
