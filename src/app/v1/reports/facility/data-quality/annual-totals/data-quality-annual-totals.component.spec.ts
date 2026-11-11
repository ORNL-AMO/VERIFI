import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { EGridService } from '@shared/helper-services/e-grid.service';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { getCalanderizedMeterData } from '@domain/calculations/calanderization/calanderizeMeters';
import { buildDataQualityAnnualTotals } from '@domain/reports/data-quality-report-annual-totals';
import { getFuelTypeOptions } from '@shared/fuel-options/getFuelTypeOptions';
import { setupReportWorkbench } from '../../testing/report-workbench-test-setup';
import { ANNUAL_TEST_EMISSIONS, annualTotalsSnapshot } from '../testing/data-quality-annual-totals-test-fixtures';
import { DataQualityReportService } from '../data-quality-report.service';
import { DataQualityAnnualTotalsComponent } from './data-quality-annual-totals.component';

async function setup(snapshot = annualTotalsSnapshot()) {
  const view = await setupReportWorkbench(snapshot.facilityReports, [WorkspaceCalendarizationService,
    { provide: EGridService, useValue: { excelCo2Emissions: ANNUAL_TEST_EMISSIONS } }], snapshot);
  const workbench = await view.open('report-a', 'report');
  const service = workbench.workbench.session()!.injector.get(DataQualityReportService);
  await vi.waitFor(() => { view.harness.detectChanges(); expect(service.state().state).toBe('ready'); });
  const root = view.harness.routeNativeElement!;
  return { ...view, service, root, table: () => view.harness.routeDebugElement!.query(By.directive(DataQualityAnnualTotalsComponent)).componentInstance as DataQualityAnnualTotalsComponent };
}
describe('Annual Totals in the report workbench', () => {
  beforeEach(() => vi.stubGlobal('Worker', undefined));
  afterEach(() => vi.unstubAllGlobals());
  it('renders annual-only content, sorts by year and cost with v0 direction behavior, and leaves PDF disabled', async () => {
    const { root, harness, table } = await setup();
    expect(root.querySelectorAll('app-data-quality-annual-totals')).toHaveLength(1);
    expect(root.querySelector('app-meter-quality-presentation, app-data-quality-report-histogram')).toBeNull();
    expect(table().rows().map(row => row.year)).toEqual([2023, 2024]);
    const buttons = root.querySelectorAll<HTMLButtonElement>('app-data-quality-annual-totals button');
    buttons[0].click(); harness.detectChanges();
    expect(table().rows().map(row => row.year)).toEqual([2024, 2023]);
    buttons[buttons.length - 1].click(); harness.detectChanges();
    expect(table().rows().map(row => row.year)).toEqual([2024, 2023]);
    expect(root.querySelector('th[aria-sort="descending"]')!.textContent).toContain('Total Cost');
    expect(table().rows()[0].cells.at(-1)!.text).toBe('$70');
    expect(root.querySelector<HTMLButtonElement>('button[title="PDF export is not available yet."]')?.disabled
      ?? [...root.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.includes('PDF'))?.disabled).toBe(true);
    expect(root.textContent).not.toContain('Sections being implemented');
  });
  it('suppresses stale readings immediately, updates facility projections and Other Impacts without saving report settings', async () => {
    const { root, service, store, harness, updateSetup } = await setup();
    const first = service.state().value!.annualTotals[0].rows[0].energyUse;
    const changedReading = { ...store.meterData()[0], totalEnergyUse: 1000 };
    store.publishCommittedPatch({ collections: [{ collection: 'meterData', upsert: [changedReading] }] });
    expect(service.state().value).toBeUndefined(); harness.detectChanges();
    expect(root.querySelector('app-data-quality-annual-totals')).toBeNull();
    await vi.waitFor(() => { harness.detectChanges(); expect(service.state().state).toBe('ready'); });
    expect(service.state().value!.annualTotals[0].rows[0].energyUse).toBeGreaterThan(first);
    const changedFacility = { ...store.facilities()[0], energyUnit: 'kWh', energyIsSource: false };
    store.publishCommittedPatch({ collections: [{ collection: 'facilities', upsert: [changedFacility] }] });
    expect(service.state().value).toBeUndefined();
    await vi.waitFor(() => { harness.detectChanges(); expect(service.state().state).toBe('ready'); });
    expect(service.state().value!.annualTotals[0].rows[0].energyUse).toBeCloseTo(1200);
    store.publishCommittedPatch({ account: { ...store.account()!, displayEmissions: false } });
    await vi.waitFor(() => { harness.detectChanges(); expect(service.state().state).toBe('ready'); });
    expect(service.state().value!.annualTotals[0].columns.map(column => column.key)).toEqual(['year', 'energyUse', 'energyCost']);
    expect(updateSetup).not.toHaveBeenCalled();
  });
  it('shows an empty annual table state for meters without readings', async () => {
    const snapshot = annualTotalsSnapshot(); snapshot.meterData = [];
    const { root } = await setup(snapshot);
    expect(root.textContent).toContain('No calendarized readings are available for annual totals.');
  });
  it('starts calendarization only on Report, reports rate-loading failures, and retries current inputs', async () => {
    const snapshot = annualTotalsSnapshot();
    const rates = { excelCo2Emissions: undefined as typeof ANNUAL_TEST_EMISSIONS | undefined,
      parseEGridData: vi.fn().mockRejectedValueOnce(new Error('Unavailable')).mockImplementationOnce(async () => {
        rates.excelCo2Emissions = ANNUAL_TEST_EMISSIONS;
      }) };
    const view = await setupReportWorkbench(snapshot.facilityReports, [WorkspaceCalendarizationService,
      { provide: EGridService, useValue: rates }], snapshot);
    await view.open('report-a', 'setup'); view.harness.detectChanges();
    expect(rates.parseEGridData).not.toHaveBeenCalled();
    const workbench = await view.open('report-a', 'report');
    const service = workbench.workbench.session()!.injector.get(DataQualityReportService);
    await vi.waitFor(() => { view.harness.detectChanges(); expect(service.state().state).toBe('error'); });
    expect(service.state().message).toContain('Emissions rates could not be loaded');
    expect(service.state().value).toBeUndefined(); service.retry();
    await vi.waitFor(() => { view.harness.detectChanges(); expect(service.state().state).toBe('ready'); });
    expect(rates.parseEGridData).toHaveBeenCalledTimes(2);
    expect(service.state().value!.annualTotals[0].rows[0].totalWithLocationEmissions).toBeGreaterThan(0);
  });
  it.each(['electricity', 'gas', 'stationary fuel', 'mobile fuel', 'water', 'REC', 'fugitive', 'process'] as const)('matches direct v0 facility calendarization for %s with fiscal and source settings', async kind => {
    const snapshot = annualTotalsSnapshot();
    if (kind === 'gas') Object.assign(snapshot.meters[0], { source: 'Natural Gas', scope: 1, startingUnit: 'SCF', heatCapacity: .001026, energyUnit: 'MMBtu' });
    if (kind === 'water') Object.assign(snapshot.meters[0], { source: 'Water Intake', startingUnit: 'gal', includeInEnergy: false });
    if (kind === 'REC') Object.assign(snapshot.meters[0], { agreementType: 4, recsMultiplier: 1, includeInEnergy: false });
    if (kind === 'stationary fuel' || kind === 'mobile fuel') {
      const scope = kind === 'mobile fuel' ? 2 : 1;
      const fuel = getFuelTypeOptions('Other Fuels', 'Liquid', [], scope, 1, 1)[0];
      Object.assign(snapshot.meters[0], { source: 'Other Fuels', scope, phase: 'Liquid', startingUnit: 'gal',
        energyUnit: 'MMBtu', fuel: fuel.value, vehicleFuel: fuel.value, heatCapacity: fuel.heatCapacityValue, vehicleCategory: 1, vehicleType: 1,
        vehicleCollectionType: 1, vehicleFuelEfficiency: 25 });
    }
    if (kind === 'fugitive' || kind === 'process') Object.assign(snapshot.meters[0], { source: 'Other', scope: kind === 'fugitive' ? 5 : 6,
      startingUnit: 'kg', energyUnit: 'kg', includeInEnergy: false, globalWarmingPotentialOption: 102 });
    const { service } = await setup(snapshot);
    const direct = getCalanderizedMeterData([snapshot.meters[0]], snapshot.meterData, snapshot.facilities[0], false, undefined,
      ANNUAL_TEST_EMISSIONS, [...snapshot.customFuels], snapshot.facilities, snapshot.account.assessmentReportVersion, [...snapshot.customGWPs])[0];
    const expected = buildDataQualityAnnualTotals(direct, true), actual = service.state().value!.annualTotals[0];
    expect(actual.columns).toEqual(expected.columns);
    expect(actual.rows.map(row => row.year)).toEqual(expected.rows.map(row => row.year));
    for (let index = 0; index < expected.rows.length; index++) {
      for (const column of expected.columns) expect(actual.rows[index][column.key]).toBeCloseTo(expected.rows[index][column.key], 8);
    }
    if (kind === 'electricity') expect(actual.rows[0].totalWithLocationEmissions).toBeGreaterThan(0);
    if (kind === 'water') expect(actual.rows[0].energyConsumption).toBeGreaterThan(0);
    if (kind === 'gas' || kind === 'stationary fuel') expect(actual.rows[0].stationaryEmissions).toBeGreaterThan(0);
    if (kind === 'mobile fuel') expect(actual.rows[0].mobileTotalEmissions).toBeGreaterThan(0);
    if (kind === 'fugitive') expect(actual.rows[0].fugitiveEmissions).toBeGreaterThan(0);
    if (kind === 'process') expect(actual.rows[0].processEmissions).toBeGreaterThan(0);
  });
});
