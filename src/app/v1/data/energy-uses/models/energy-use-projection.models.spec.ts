import { energyUseFacility, energyUseGroup, energyUseItem, energyUseSource } from '../energy-uses.testing';
import { buildEnergyUseTreemap, energyUseChartYears, energyUseFiscalPeriod, projectEnergyUse, projectEnergyUseSource } from './energy-use-projection.models';

describe('Committed Energy Use forward projection', () => {
  const facility = { ...energyUseFacility(), energyUnit: 'kWh', fiscalYear: 'calendarYear' as const };
  function item(guid = 'older', year = 2022, amount = 100) {
    return energyUseItem({ guid, utilityData: [energyUseSource({ energyUse: [{ year, energyUse: amount, overrideEnergyUse: true, energyUseUnit: 'kWh' }] })] });
  }
  it('keeps older equipment unchanged when newer equipment introduces a later year, without writing rows', () => {
    const older = item(), newer = item('newer', 2025, 50), before = JSON.stringify([older, newer]);
    const projected = [older, newer].map(item => projectEnergyUse(item, facility, 2025, 'kWh')!);
    expect(projected.reduce((sum, row) => sum + row.amount, 0)).toBe(150);
    expect(projected[0].sources[0]).toMatchObject({ state: 'carried', originYear: 2022, originalAmount: 100, override: true });
    expect(projected[1].sources[0].state).toBe('entered');
    expect(projectEnergyUse(newer, facility, 2024, 'kWh')!.sources[0]).toMatchObject({ amount: null, state: 'missing' });
    expect(energyUseChartYears([older, newer])).toEqual([2022, 2023, 2024, 2025]);
    expect(JSON.stringify([older, newer])).toBe(before);
  });
  it('uses later explicit zeroes and never falls back past a newer invalid or repeated entry', () => {
    const equipment = item(); equipment.utilityData[0].energyUse.push({ year: 2024, energyUse: 0, overrideEnergyUse: false, energyUseUnit: 'kWh' });
    expect(projectEnergyUse(equipment, facility, 2025, 'kWh')!.sources[0]).toMatchObject({ amount: 0, state: 'carried', originYear: 2024, override: false });
    equipment.utilityData[0].energyUse[1].energyUse = NaN;
    expect(projectEnergyUse(equipment, facility, 2025, 'kWh')!).toMatchObject({ amount: 0, partial: true, sources: [expect.objectContaining({ state: 'invalid', amount: null })] });
    equipment.utilityData[0].energyUse[1].energyUse = 25; equipment.utilityData[0].energyUse.push({ ...equipment.utilityData[0].energyUse[1] });
    expect(projectEnergyUse(equipment, facility, 2025, 'kWh')!.sources[0].state).toBe('invalid');
  });
  it('projects sources independently, converts units, and retains repeated source occurrences', () => {
    const equipment = item(); equipment.utilityData.push(energyUseSource({ energyUse: [{ year: 2024, energyUse: 3.6, overrideEnergyUse: false, energyUseUnit: 'MJ' }] }));
    const projected = projectEnergyUse(equipment, facility, 2025, 'kWh')!;
    expect(projected.amount).toBeCloseTo(101, 6); expect(new Set(projected.sources.map(row => row.id)).size).toBe(2);
    expect(projected.sources.map(row => row.originYear)).toEqual([2022, 2024]);
    expect(projectEnergyUseSource(equipment, equipment.utilityData[0], 0, 2025, 'invalid').state).toBe('invalid');
  });
  it('stops projection after the last active year, retains explicit later entries, and resumes on reinstatement', () => {
    const equipment = item(); equipment.noLongerInUse = { isNoLongerInUse: true, year: 2024 };
    expect(projectEnergyUse(equipment, facility, 2024, 'kWh')!.amount).toBe(100);
    expect(projectEnergyUse(equipment, facility, 2025, 'kWh')!.sources[0]).toMatchObject({ state: 'inactive', amount: 0 });
    equipment.utilityData[0].energyUse.push({ year: 2026, energyUse: 10, energyUseUnit: 'kWh', overrideEnergyUse: true });
    expect(projectEnergyUse(equipment, facility, 2026, 'kWh')!.sources[0].state).toBe('entered');
    expect(projectEnergyUse(equipment, facility, 2027, 'kWh')!.sources[0].state).toBe('inactive');
    equipment.noLongerInUse = { isNoLongerInUse: false, year: null };
    expect(projectEnergyUse(equipment, facility, 2027, 'kWh')!.amount).toBe(10);
  });
  it('retains explicit consumption even when imported retirement metadata is incomplete', () => {
    const equipment = item(); equipment.noLongerInUse = { isNoLongerInUse: true, year: null };
    expect(projectEnergyUse(equipment, facility, 2022, 'kWh')!.sources[0].state).toBe('entered');
    expect(projectEnergyUse(equipment, facility, 2023, 'kWh')!.sources[0].state).toBe('invalid');
  });
  it('groups portfolio totals only within actual fiscal periods and keeps group/item GUID provenance', () => {
    const fiscal = { ...facility, guid: 'facility-b', fiscalYear: 'nonCalendarYear' as const, fiscalYearMonth: 6, fiscalYearCalendarEnd: true };
    const a = projectEnergyUse(item(), facility, 2025, 'kWh')!;
    const b = projectEnergyUse({ ...item('other'), facilityId: fiscal.guid }, fiscal, 2025, 'kWh')!;
    expect(energyUseFiscalPeriod(facility, 2025)!.key).toBe('2025-01-01 / 2025-12-31');
    expect(energyUseFiscalPeriod(fiscal, 2025)!.key).toBe('2024-07-01 / 2025-06-30');
    const tree = buildEnergyUseTreemap([a, b], [energyUseGroup()]);
    expect(tree).toHaveLength(2); expect(tree.map(node => node.value)).toEqual([100, 100]);
    expect(tree.every(node => node.percentOfPeriod === 100 && node.carried)).toBe(true);
    expect(tree.flatMap(node => node.children!).flatMap(node => node.children!).flatMap(node => node.children!).map(node => node.itemGuid).sort()).toEqual(['older', 'other']);
    expect(buildEnergyUseTreemap([a], [energyUseGroup()], 'group-a', facility.guid)[0].kind).toBe('group');
  });
  it('combines matching actual periods without rounding intermediate amounts', () => {
    const a = projectEnergyUse(item('a', 2022, 0.1), facility, 2025, 'kWh')!;
    const b = projectEnergyUse(item('b', 2023, 0.2), { ...facility, guid: 'facility-b' }, 2025, 'kWh')!;
    const tree = buildEnergyUseTreemap([a, b], []);
    expect(tree).toHaveLength(1); expect(tree[0].value).toBeCloseTo(0.3, 14); expect(tree[0].children).toHaveLength(2);
  });
});
