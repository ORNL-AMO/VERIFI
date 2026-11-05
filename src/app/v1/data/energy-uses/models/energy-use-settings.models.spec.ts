import { energyUseFacility, energyUseGroup, energyUseItem, energyUseSource } from '../energy-uses.testing';
import { applyEnergyUseSettings, createEnergyUse, defaultEnergyUseSource, energyUseSettings, energyUseSettingsError,
  previousEnergyUseYear, reconcileEnergyUseSettings } from './energy-use-settings.models';

describe('Energy Use Settings mappings', () => {
  const facility = { ...energyUseFacility(), energyUnit: 'kWh', fiscalYear: 'calendarYear' as const };
  function item() {
    return energyUseItem({ utilityMeterGroupIds: [], operatingConditionsData: [{ year: 2024, hoursOfOperation: 100, loadFactor: 50, dutyFactor: 100, efficiency: 50 }],
      utilityData: [energyUseSource({ energyUse: [{ year: 2024, energyUse: 17, overrideEnergyUse: false, energyUseUnit: 'kWh' },
        { year: 2023, energyUse: 0, overrideEnergyUse: true, energyUseUnit: 'GJ' }] })] });
  }
  it('creates an initial calculated year without readings and accepts valid zero capacity', () => {
    const created = createEnergyUse({ settings: { name: 'New', notes: '', equipmentType: 'Other', sources: [defaultEnergyUseSource()], utilityMeterGroupIds: [] },
      initialYear: 2025, group: { kind: 'existing', guid: 'group-a' } }, energyUseGroup(), facility);
    expect(created.operatingConditionsData).toEqual([{ year: 2025, hoursOfOperation: 8760, loadFactor: 100, dutyFactor: 100, efficiency: 100 }]);
    expect(created.utilityData[0].energyUse).toEqual([{ year: 2025, energyUse: 0, overrideEnergyUse: false, energyUseUnit: 'kWh' }]);
  });
  it('metadata edits preserve the exact saved history, lifecycle and relationships without recalculation', () => {
    const current = item(), settings = energyUseSettings(current);
    const result = applyEnergyUseSettings(current, { ...settings, name: ' New name ' }, facility);
    expect(result).toEqual({ ...current, name: 'New name' });
    expect(current.name).toBe('Pump A');
  });
  it.each([false, true])('ignores annual history carried by a structurally wider source (capacity changed: %s)', changeCapacity => {
    const current = item(), settings = energyUseSettings(current);
    const staleSource = structuredClone(current.utilityData[0]);
    staleSource.energyUse.forEach(annual => { annual.energyUse = 999; annual.overrideEnergyUse = true; });
    if (changeCapacity) staleSource.size = 10;
    const result = applyEnergyUseSettings(current, { ...settings, name: 'Updated', sources: [staleSource] }, facility);
    expect(result.utilityData[0].energyUse).toEqual([
      { year: 2024, energyUse: changeCapacity ? 1000 : 17, overrideEnergyUse: false, energyUseUnit: 'kWh' },
      { year: 2023, energyUse: 0, overrideEnergyUse: true, energyUseUnit: 'GJ' }
    ]);
    expect(current.utilityData[0].energyUse[0].energyUse).toBe(17);
  });
  it.each([['Electricity', 1000], ['Natural Gas', 500]] as const)('recalculates %s and retains overridden zeroes', (energySource, expected) => {
    const current = item(); current.utilityData[0].energySource = energySource;
    const settings = energyUseSettings(current);
    const result = applyEnergyUseSettings(current, { ...settings, sources: [{ ...settings.sources[0], size: 10 }] }, facility);
    expect(result.utilityData[0].energyUse.map(row => row.energyUse)).toEqual([expected, 0]);
    expect(current.utilityData[0].energyUse[0].energyUse).toBe(17);
  });
  it('uses the existing conversion precision', () => {
    const current = item(); current.utilityData[0].energyUse[0].energyUseUnit = 'GJ';
    const settings = energyUseSettings(current);
    expect(applyEnergyUseSettings(current, { ...settings, sources: [{ ...settings.sources[0], size: 10 }] }, facility).utilityData[0].energyUse[0].energyUse).toBe(3.6);
  });
  it('rejects missing assumptions and non-finite or invalid calculation inputs without mutating history', () => {
    for (const conditions of [[], [{ ...item().operatingConditionsData[0], efficiency: 0 }]]) {
      const current = item(); current.operatingConditionsData = conditions;
      const settings = energyUseSettings(current);
      expect(() => applyEnergyUseSettings(current, { ...settings, sources: [{ ...settings.sources[0], size: 10 }] }, facility)).toThrow('Cannot calculate');
      expect(current.utilityData[0].energyUse[0].energyUse).toBe(17);
    }
    const current = item(), settings = energyUseSettings(current);
    expect(() => applyEnergyUseSettings(current, { ...settings, sources: [{ ...settings.sources[0], size: Infinity }] }, facility)).toThrow('finite capacity');
  });
  it('links and unlinks associations without changing source history', () => {
    const current = item(), settings = energyUseSettings(current);
    expect(applyEnergyUseSettings(current, { ...settings, utilityMeterGroupIds: ['new-group'] }, facility).utilityData).toEqual(current.utilityData);
  });
  it('requires current, explicit removal review including annual overrides', () => {
    const current = item(), settings = { ...energyUseSettings(current), sources: [] };
    expect(() => applyEnergyUseSettings(current, settings, facility)).toThrow('Review the source removal');
    expect(applyEnergyUseSettings(current, settings, facility, [current.utilityData[0]]).utilityData).toEqual([]);
    const review = structuredClone(current.utilityData[0]); current.utilityData[0].energyUse[0].energyUse = 99;
    expect(() => applyEnergyUseSettings(current, settings, facility, [review])).toThrow('Review the source removal');
  });
  it('preserves imported extra/duplicate source rows for metadata and rejects ambiguous configuration edits', () => {
    const current = item(); current.utilityData.push(energyUseSource(), energyUseSource({ energySource: 'Other Energy' }));
    const settings = energyUseSettings(current);
    expect(applyEnergyUseSettings(current, { ...settings, notes: 'Updated' }, facility).utilityData).toEqual(current.utilityData);
    expect(energyUseSettingsError({ ...settings, sources: settings.sources.slice(1) }, settings)).toContain('Repeated saved source');
  });
  it('merges metadata independently and reviews coupled source/link conflicts', () => {
    const base = energyUseSettings(item());
    const local = { ...base, name: 'Local', sources: [{ ...base.sources[0], size: 10 }] };
    const saved = { ...base, notes: 'Saved notes', utilityMeterGroupIds: ['saved-group'] };
    const merged = reconcileEnergyUseSettings(base, local, saved);
    expect(merged.value).toMatchObject({ name: 'Local', notes: 'Saved notes' });
    expect(merged.conflicts.map(row => row.id)).toEqual(['configuration']);
    expect(reconcileEnergyUseSettings(base, local, saved, { configuration: 'saved' }).value.sources).toEqual(base.sources);
  });
  it('uses fiscal year labels for the previous completed year', () => {
    expect(previousEnergyUseYear(facility, new Date(2026, 10, 4))).toBe(2025);
    expect(previousEnergyUseYear({ ...facility, fiscalYear: 'nonCalendarYear', fiscalYearMonth: 6, fiscalYearCalendarEnd: true }, new Date(2026, 10, 4))).toBe(2026);
  });
});
