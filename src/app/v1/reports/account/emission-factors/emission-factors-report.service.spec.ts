import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { EGridService } from '@shared/helper-services/e-grid.service';
import { SubregionEmissions } from '@data/models/eGridEmissions';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { emissionFactorsRates } from '@domain/reports/testing/emission-factors-fixtures';
import { accountEmissionFactorsSnapshot } from './testing/emission-factors-fixtures';
import { AccountEmissionFactorsReportEditor } from './editing/emission-factors-report-editor.service';
import { AccountEmissionFactorsReportService } from './emission-factors-report.service';

describe('account Emission Factors results', () => {
  afterEach(() => TestBed.resetTestingModule());
  function setup() {
    const snapshot = signal(accountEmissionFactorsSnapshot()), stage = signal('setup'), pending = signal(false), valid = signal(true);
    const rates = signal<readonly SubregionEmissions[] | undefined>(emissionFactorsRates());
    const editor = { setupValid: valid, state: signal('idle'),
      context: { key: computed(() => `${snapshot().account.guid}:${snapshot().accountReports[0].guid}`),
        report: computed(() => snapshot().accountReports[0]), stage,
        workspace: { snapshot, account: computed(() => snapshot().account), hasPending: pending, isReady: () => true, status: () => 'ready' } } };
    TestBed.configureTestingModule({ providers: [AccountEmissionFactorsReportService,
      { provide: AccountEmissionFactorsReportEditor, useValue: editor }, { provide: EGridService, useValue: { builtinEmissions: rates } },
      { provide: WorkspaceCalendarizationService, useValue: { calendarizeBase: () => of({ state: 'idle', meters: [] }), retry: vi.fn() } }
    ] });
    return { service: TestBed.inject(AccountEmissionFactorsReportService), snapshot, stage, pending, valid, rates };
  }
  it('runs only on Report and returns detached facility results, including empty facilities', () => {
    const { service, stage, pending } = setup();
    TestBed.tick(); expect(service.state().state).toBe('idle'); expect(service.exportSnapshot()).toBeUndefined();
    stage.set('report'); TestBed.tick();
    const exported = service.exportSnapshot()!;
    expect(exported.identity).toMatchObject({ scope: 'account', reportGuid: 'account-report' });
    expect(exported.results.map(result => result.facility.guid)).toEqual(['facility', 'second', 'empty']);
    expect(exported.results[0].electricity.map(row => row.year)).toEqual([2022, 2023, 2024]);
    expect(exported.results[1].electricity).toEqual([]); expect(exported.results[1].other).toHaveLength(1);
    exported.results[0].electricity[0].marketRate.CO2 = -1;
    expect(service.state().value?.[0].electricity[0].marketRate.CO2).toBe(300);
    pending.set(true); expect(service.state().value).toBeUndefined(); expect(service.exportSnapshot()).toBeUndefined();
  });
  it('immediately hides stale results when facilities, meters, catalogs, or period change', () => {
    const { service, snapshot, stage, rates } = setup(); stage.set('report'); TestBed.tick();
    snapshot.update(value => ({ ...value, facilities: value.facilities.filter(facility => facility.guid !== 'second') }));
    expect(service.state().value).toBeUndefined(); TestBed.tick(); expect(service.state().value).toHaveLength(2);
    snapshot.update(value => ({ ...value, meters: value.meters.filter(meter => meter.source !== 'Natural Gas') }));
    expect(service.state().value).toBeUndefined(); TestBed.tick(); expect(service.state().value?.[0].other).toEqual([]);
    rates.set([{ ...emissionFactorsRates()[0], residualEmissionRates: [{ year: 2022, CO2: 999, CH4: 0, N2O: 0 }] }]);
    expect(service.state().value).toBeUndefined(); TestBed.tick(); expect(service.state().value?.[0].electricity[0].marketRate.CO2).toBe(999);
    snapshot.update(value => ({ ...value, accountReports: [{ ...value.accountReports[0], startYear: 2023 }] }));
    expect(service.state().value).toBeUndefined(); TestBed.tick();
    expect(service.state().value?.[0].electricity.map(row => row.year)).toEqual([2023, 2024]);
  });
  it('waits for catalogs, rejects invalid setup, and retries without exposing stale content', () => {
    const { service, stage, rates, valid } = setup(); stage.set('report'); rates.set(undefined); TestBed.tick();
    expect(service.state().state).toBe('waiting');
    rates.set(emissionFactorsRates()); TestBed.tick(); expect(service.state().state).toBe('ready');
    valid.set(false); expect(service.state().value).toBeUndefined(); TestBed.tick(); expect(service.state().state).toBe('error');
    valid.set(true); service.retry(); TestBed.tick(); expect(service.state().state).toBe('ready');
  });
  it('does not reuse results across accounts with matching report GUIDs', () => {
    const { service, snapshot, stage } = setup(); stage.set('report'); TestBed.tick();
    snapshot.update(value => ({ ...value, account: { ...value.account, guid: 'another' },
      accountReports: [{ ...value.accountReports[0], accountId: 'another' }],
      facilities: value.facilities.map(facility => ({ ...facility, accountId: 'another', name: 'Another facility' })), meters: [] }));
    expect(service.state().value).toBeUndefined(); TestBed.tick();
    expect(service.state().value?.[0].facility.name).toBe('Another facility'); expect(service.state().value?.[0].electricity).toEqual([]);
  });
});
