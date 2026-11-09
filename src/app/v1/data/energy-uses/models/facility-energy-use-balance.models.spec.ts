import type { CalanderizedMeter, MonthlyData } from '@data/models/calanderization';
import type { IdbFacility } from '@data/models/idbModels/facility';
import type { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import type { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { meter, reading } from '@app/v1/data/meters/facility-meters.testing';
import { energyUseFacility, energyUseGroup, energyUseItem, energyUseSource, energyUsesSnapshot } from '../energy-uses.testing';
import { getCalanderizedMeterData } from '@domain/calculations/calanderization/calanderizeMeters';
import { buildWorkspaceCalendarizationRequest } from '@app/v1/shared/calendarization/workspace-calendarization-request';
import { projectWorkspaceCalendarization } from '@app/v1/shared/calendarization/workspace-calendarization-projection';
import { buildEnergyUseGroups } from '../inventory/energy-use-group.models';
import { buildEnergyUseInventory } from '../inventory/energy-use-inventory.models';
import { facilityEnergyUseFlowOption } from '../energy-use-workbench/results/energy-use-results-charts';
import { buildFacilityEnergyUseResult } from './facility-energy-use-results.models';
import { buildFacilityEnergyUseBalance, facilityEnergyBalanceYear } from './facility-energy-use-balance.models';

describe('Facility energy balance', () => {
  const facility = { ...energyUseFacility(), energyUnit: 'kWh', fiscalYear: 'calendarYear' as const };
  function bills(guid = 'electricity', amount = 10, year = 2025, unit = 'kWh') {
    const value = meter({ guid, source: guid === 'gas' ? 'Natural Gas' : 'Electricity', meterReadingDataApplication: 'fullMonth', energyUnit: unit });
    const readings = Array.from({ length: 12 }, (_, index) => reading({ guid: `${guid}-${year}-${index}`, meterId: guid, year, month: index + 1, totalEnergyUse: amount }));
    const projected = { meter: value, energyUnit: unit, energyIsSource: false,
      monthlyData: readings.map(row => ({ date: new Date(year, row.month - 1, 1), energyUse: amount, fiscalYear: year } as MonthlyData)) } as CalanderizedMeter;
    return { projected, readings };
  }
  function equipment(amount = 90) {
    const items = [energyUseItem({ utilityData: [energyUseSource({ energyUse: [{ year: 2022, energyUse: amount, energyUseUnit: 'kWh', overrideEnergyUse: true }] })] })];
    const groups = buildEnergyUseGroups(facility.accountId, [facility], [energyUseGroup()], buildEnergyUseInventory(facility.accountId, [facility], items, [energyUseGroup()]));
    return buildFacilityEnergyUseResult(groups, facility, 2025)!;
  }

  function canonicalMeters(owner: IdbFacility, meters: readonly IdbUtilityMeter[], readings: readonly IdbUtilityMeterData[]): readonly CalanderizedMeter[] {
    const snapshot = { ...energyUsesSnapshot(), facilities: [owner], meters: [...meters], meterData: [...readings] };
    const request = buildWorkspaceCalendarizationRequest(snapshot), input = request.payload;
    const result = getCalanderizedMeterData(input.meters, input.allMeterData, input.accountOrFacility, input.monthDisplayShort, input.calanderizationOptions,
      input.co2Emissions, input.customFuels, input.facilities, input.assessmentReportVersion, input.customGWPs);
    const projected = projectWorkspaceCalendarization({ state: 'ready', accountGuid: snapshot.account.guid, inputFingerprint: request.inputFingerprint, meters: result }, snapshot,
      { context: { kind: 'facility', guid: owner.guid }, energyUnit: owner.energyUnit, energyIsSource: false, includeEmissions: false });
    expect(projected.state).toBe('ready');
    return projected.meters;
  }

  it.each([false, true])('retains annual allocation into a July–June fiscal year with another complete meter=%s', includeCompleteMeter => {
    const owner = { ...facility, fiscalYear: 'nonCalendarYear' as const, fiscalYearMonth: 6, fiscalYearCalendarEnd: true };
    const annual = meter({ guid: 'annual', meterReadingDataApplication: 'fullYear' });
    const annualBill = reading({ guid: 'annual-bill', meterId: annual.guid, year: 2025, month: 12, totalEnergyUse: 120 });
    const first = bills('covered', 10, 2024), second = bills('covered', 10, 2025);
    const meters = includeCompleteMeter ? [annual, first.projected.meter] : [annual];
    const readings = includeCompleteMeter ? [annualBill, ...first.readings, ...second.readings] : [annualBill];
    const projected = canonicalMeters(owner, meters, readings);
    const allocated = projected[0].monthlyData.filter(row => row.fiscalYear === 2025).reduce((sum, row) => sum + row.energyUse, 0);
    expect(allocated).toBe(60);
    const balance = buildFacilityEnergyUseBalance(owner, 2025, projected, readings);
    expect(balance).toMatchObject({ consumption: includeCompleteMeter ? 180 : 60, complete: false, unaccounted: null, accountedPercent: null });
    expect(balance.sources[0].coverage).toContain(includeCompleteMeter ? '18 of 24' : '6 of 12');
  });

  it('uses full-month coverage for older meters without a saved calendarization mode', () => {
    const electric = bills();
    const legacy = { ...electric.projected.meter, meterReadingDataApplication: undefined };
    const readings = electric.readings.map(row => ({ ...row, day: 15 }));
    const projected = canonicalMeters(facility, [legacy], readings);
    expect(projected[0].monthlyData.reduce((sum, row) => sum + row.energyUse, 0)).toBe(120);
    expect(buildFacilityEnergyUseBalance(facility, 2025, projected, readings)).toMatchObject({ consumption: 120, complete: true, unaccounted: 120 });
  });

  it('still excludes annual bills whose allocation year begins after the fiscal year', () => {
    const owner = { ...facility, fiscalYear: 'nonCalendarYear' as const, fiscalYearMonth: 6, fiscalYearCalendarEnd: true };
    const annual = meter({ guid: 'future', meterReadingDataApplication: 'fullYear' });
    const first = bills('covered', 10, 2024), second = bills('covered', 10, 2025);
    const readings = [...first.readings, ...second.readings,
      reading({ meterId: annual.guid, year: 2026, month: 12, totalEnergyUse: 120 })];
    const projected = canonicalMeters(owner, [first.projected.meter, annual], readings);
    expect(buildFacilityEnergyUseBalance(owner, 2025, projected, readings)).toMatchObject({ consumption: 120, complete: true, unaccounted: 120 });
  });

  it('rejects an invalid contributing next-year boundary instead of using a later valid bill', () => {
    const electric = bills();
    const backward = { ...electric.projected.meter, meterReadingDataApplication: 'backward' as const };
    const boundary = reading({ guid: 'invalid-boundary', meterId: backward.guid, year: 2026, month: 1, day: 15, totalEnergyUse: NaN });
    const readings = [reading({ guid: 'previous-boundary', meterId: backward.guid, year: 2024, month: 12, day: 15 }),
      ...electric.readings.map(row => ({ ...row, day: 15 })), boundary,
      reading({ guid: 'later-valid-bill', meterId: backward.guid, year: 2026, month: 2, day: 15 })];
    const projected = canonicalMeters(facility, [backward], readings);
    const december = projected[0].monthlyData.find(row => row.year === 2025 && row.monthNumValue === 11)!;
    expect(december.energyUse).toBe(0);
    const balance = buildFacilityEnergyUseBalance(facility, 2025, projected, readings);
    expect(balance).toMatchObject({ complete: false, unaccounted: null, accountedPercent: null });
    expect(balance.sources[0].coverage).toContain('11 of 12');
    const corrected = readings.map(row => row.guid === boundary.guid ? { ...row, totalEnergyUse: 10 } : row);
    expect(buildFacilityEnergyUseBalance(facility, 2025, canonicalMeters(facility, [backward], corrected), corrected).complete).toBe(true);
  });

  it('validates the canonical next-month bill without rejecting unrelated invalid future bills', () => {
    const electric = bills();
    const backward = { ...electric.projected.meter, meterReadingDataApplication: 'backward' as const };
    const readings = [reading({ guid: 'previous', meterId: backward.guid, year: 2024, month: 12, day: 15 }),
      ...electric.readings.map(row => ({ ...row, day: 15 })),
      reading({ guid: 'unused-january', meterId: backward.guid, year: 2026, month: 1, day: 5, totalEnergyUse: NaN }),
      reading({ guid: 'used-january', meterId: backward.guid, year: 2026, month: 1, day: 20, totalEnergyUse: 10 }),
      reading({ guid: 'unrelated-february', meterId: backward.guid, year: 2026, month: 2, day: 15, totalEnergyUse: NaN })];
    const projected = canonicalMeters(facility, [backward], readings);
    expect(buildFacilityEnergyUseBalance(facility, 2025, projected, readings).complete).toBe(true);
  });

  it('balances converted site consumption against all equipment and includes meter-only sources as unaccounted flows', () => {
    const electric = bills('electricity', 36, 2025, 'MJ'), gas = bills('gas', 5);
    const meters = [electric.projected, gas.projected], readings = [...electric.readings, ...gas.readings], use = equipment();
    const before = JSON.stringify({ meters, readings, use });
    const balance = buildFacilityEnergyUseBalance(facility, 2025, meters, readings, use);
    expect(balance).toMatchObject({ consumption: 180, equipment: 90, unaccounted: 90, accountedPercent: 50, complete: true });
    expect(balance.sources).toEqual(expect.arrayContaining([expect.objectContaining({ source: 'Electricity', accountedPercent: 75 }), expect.objectContaining({ source: 'Natural Gas', accountedPercent: 0 })]));
    expect(balance.sources.map(row => [row.source, row.consumption, row.equipment, row.unaccounted])).toEqual([
      ['Electricity', 120, 90, 30], ['Natural Gas', 60, 0, 60]
    ]);
    const series = facilityEnergyUseFlowOption(use, 'kWh', balance).series as { links: { source: string; target: string; value: number }[]; data: { name: string; description: string }[] }[];
    expect(series[0].links.filter(link => link.target.startsWith('unaccounted:')).map(link => link.value)).toEqual([30, 60]);
    expect(series[0].links.reduce((sum, link) => sum + link.value, 0)).toBe(180);
    expect(series[0].data.find(row => row.name === 'source:Electricity')?.description).toContain('Metered Consumption: 120 kWh');
    expect(series[0].data.find(row => row.name === 'group:group-a')?.description).toContain('50% of Facility Usage');
    expect(JSON.stringify({ meters, readings, use })).toBe(before);
  });

  it('does not treat padded zero months or invalid saved readings as complete utility coverage', () => {
    const electric = bills(), use = equipment();
    electric.projected.monthlyData[4].energyUse = 0;
    const readings = electric.readings.filter(row => row.month !== 5);
    const balance = buildFacilityEnergyUseBalance(facility, 2025, [electric.projected], readings, use);
    expect(balance).toMatchObject({ consumption: 110, complete: false, unaccounted: null, accountedPercent: null });
    expect(balance.sources[0].accountedPercent).toBeNull();
    expect(balance.sources[0].coverage).toContain('11 of 12');
    readings[0].totalEnergyUse = NaN;
    expect(buildFacilityEnergyUseBalance(facility, 2025, [electric.projected], readings, use).sources[0].coverage).toContain('10 of 12');
    const series = facilityEnergyUseFlowOption(use, 'kWh', balance).series as { links: { target: string }[] }[];
    expect(series[0].links.some(link => link.target.startsWith('unaccounted:'))).toBe(false);
  });

  it('preserves zero consumption and negative residuals without drawing negative Sankey flows', () => {
    const electric = bills('electricity', 0), use = equipment(10);
    const balance = buildFacilityEnergyUseBalance(facility, 2025, [electric.projected], electric.readings, use);
    expect(balance).toMatchObject({ consumption: 0, equipment: 10, unaccounted: -10, complete: true, accountedPercent: null });
    expect(balance.sources[0].accountedPercent).toBeNull();
    const series = facilityEnergyUseFlowOption(use, 'kWh', balance).series as { links: { value: number }[]; data: { name: string; description: string }[] }[];
    expect(series[0].links.every(link => link.value > 0)).toBe(true);
    expect(series[0].data.find(row => row.name === 'source:Electricity')?.description).toContain('Over allocated: 10 kWh');
  });

  it('uses actual fiscal dates, excludes foreign/water/disabled meters and rejects source-energy inputs', () => {
    const owner = { ...facility, fiscalYear: 'nonCalendarYear' as const, fiscalYearMonth: 6, fiscalYearCalendarEnd: true };
    const first = bills('electricity', 10, 2024), second = bills('electricity', 10, 2025);
    const electric = { ...first.projected, monthlyData: [...first.projected.monthlyData, ...second.projected.monthlyData] };
    const foreign = { ...electric, meter: { ...electric.meter, guid: 'foreign', facilityId: 'foreign' } };
    const water = { ...electric, meter: { ...electric.meter, guid: 'water', source: 'Water Intake' as const } };
    const disabled = { ...electric, meter: { ...electric.meter, guid: 'disabled', includeInEnergy: false } };
    const readings = [...first.readings, ...second.readings];
    expect(buildFacilityEnergyUseBalance(owner, 2025, [electric, foreign, water, disabled], readings)).toMatchObject({ consumption: 120, unaccounted: 120, complete: true });
    expect(buildFacilityEnergyUseBalance(owner, 2025, [{ ...electric, energyIsSource: true }], readings)).toMatchObject({ consumption: null, complete: false });
  });

  it('prefers the latest complete bill year and handles annual readings and meter retirement', () => {
    const full = bills(), partial = bills('electricity', 10, 2026);
    const meter = { ...full.projected, monthlyData: [...full.projected.monthlyData, ...partial.projected.monthlyData.slice(0, 3)] };
    expect(facilityEnergyBalanceYear([meter], facility, [...full.readings, ...partial.readings.slice(0, 3)])).toBe(2025);
    const annual = { ...full.projected, meter: { ...full.projected.meter, meterReadingDataApplication: 'fullYear' as const } };
    expect(buildFacilityEnergyUseBalance(facility, 2025, [annual], [full.readings[0]])).toMatchObject({ consumption: 120, complete: true });
    const retired = { ...full.projected, meter: { ...full.projected.meter, noLongerInUse: true, noLongerInUseYear: 2025, noLongerInUseMonth: 2 } };
    expect(buildFacilityEnergyUseBalance(facility, 2025, [retired], full.readings.slice(0, 3))).toMatchObject({ consumption: 30, complete: true });
  });

  it('consumes the canonical calculation and site-unit projection used by the facility adapter', () => {
    const electric = bills(), gas = bills('gas', 5);
    const readings = [...electric.readings, ...gas.readings];
    const projected = canonicalMeters(facility, [electric.projected.meter, gas.projected.meter], readings);
    expect(buildFacilityEnergyUseBalance(facility, 2025, projected, readings, equipment())).toMatchObject({ consumption: 180, equipment: 90, unaccounted: 90, complete: true });
  });

  it('requires backward-reading boundaries to cover the fiscal year and rejects invalid bills', () => {
    const electric = bills();
    const backward = { ...electric.projected, meter: { ...electric.projected.meter, meterReadingDataApplication: 'backward' as const } };
    const readings = [...electric.readings, reading({ guid: 'next-year-boundary', meterId: 'electricity', year: 2026, month: 1, totalEnergyUse: 10 })];
    expect(buildFacilityEnergyUseBalance(facility, 2025, [backward], readings)).toMatchObject({ consumption: 120, complete: true });
    expect(buildFacilityEnergyUseBalance(facility, 2025, [backward], readings.slice(1))).toMatchObject({ consumption: 110, complete: false, unaccounted: null });
    readings[6].totalEnergyUse = NaN;
    expect(buildFacilityEnergyUseBalance(facility, 2025, [backward], readings)).toMatchObject({ complete: false, unaccounted: null });
  });
});
