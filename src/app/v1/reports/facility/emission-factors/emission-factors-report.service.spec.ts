import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { EGridService } from '@shared/helper-services/e-grid.service';
import { SubregionEmissions } from '@data/models/eGridEmissions';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { emissionFactorsRates, emissionFactorsSnapshot } from '@domain/reports/testing/emission-factors-fixtures';
import { EmissionFactorsReportEditor } from './editing/emission-factors-report-editor.service';
import { EmissionFactorsReportService } from './emission-factors-report.service';

describe('Emission Factors result lifecycle', () => {
  it('exposes detached, cloneable export inputs only for current ready results', () => {
    const { service, stage, pending } = setup();
    expect(service.exportSnapshot()).toBeUndefined(); stage.set('report'); TestBed.tick();
    const exported = service.exportSnapshot()!;
    expect(structuredClone(exported)).toEqual(exported);
    expect(exported.identity).toMatchObject({ scope: 'facility', facilityGuid: 'facility', reportGuid: 'report-a' });
    exported.results.electricity[0].marketRate.CO2 = -1;
    expect(service.state().value?.electricity[0].marketRate.CO2).toBe(300);
    pending.set(true); expect(service.exportSnapshot()).toBeUndefined();
  });
  function setup() {
    const snapshot = signal(emissionFactorsSnapshot()), stage = signal('setup'), pending = signal(false), valid = signal(true);
    const rates = signal<readonly SubregionEmissions[] | undefined>(emissionFactorsRates());
    const editor = { setupValid: valid, state: signal('idle'),
      context: { key: computed(() => `${snapshot().account.guid}:${snapshot().facilityReports[0]?.guid}`),
        report: computed(() => snapshot().facilityReports[0]), facility: computed(() => snapshot().facilities[0]), stage,
        workspace: { snapshot, hasPending: pending, isReady: () => true, status: () => 'ready' } } };
    TestBed.configureTestingModule({ providers: [EmissionFactorsReportService,
      { provide: EmissionFactorsReportEditor, useValue: editor }, { provide: EGridService, useValue: { builtinEmissions: rates } },
      { provide: WorkspaceCalendarizationService, useValue: { calendarizeBase: () => of({ state: 'idle', meters: [] }), retry: vi.fn() } }
    ] });
    return { service: TestBed.inject(EmissionFactorsReportService), snapshot, stage, pending, valid, rates };
  }
  it('runs only on Report, invalidates old values immediately, and reflects meter, period and catalog changes', async () => {
    const { service, snapshot, stage, pending, rates } = setup();
    TestBed.tick(); expect(service.state().state).toBe('idle');
    stage.set('report'); TestBed.tick(); expect(service.state().state).toBe('ready');
    expect(service.state().value?.electricity).toHaveLength(3);
    pending.set(true); expect(service.state().value).toBeUndefined(); TestBed.tick();
    expect(service.state().state).toBe('waiting'); pending.set(false); TestBed.tick();
    snapshot.update(value => ({ ...value, meters: value.meters.filter(meter => meter.source !== 'Natural Gas') }));
    expect(service.state().value).toBeUndefined(); TestBed.tick(); expect(service.state().value?.other).toEqual([]);
    rates.set([{ ...emissionFactorsRates()[0], residualEmissionRates: [{ year: 2022, CO2: 999, CH4: 0, N2O: 0 }] }]);
    expect(service.state().value).toBeUndefined(); TestBed.tick(); expect(service.state().value?.electricity[0].marketRate.CO2).toBe(999);
    snapshot.update(value => ({ ...value, facilityReports: [{ ...value.facilityReports[0], emissionFactorsReportSettings: { startYear: 2023, endYear: 2024 } }] }));
    TestBed.tick(); expect(service.state().value?.electricity.map(row => row.year)).toEqual([2023, 2024]);
  });
  it('waits for reference data and hides invalid setup without inventing a successful result', () => {
    const { service, stage, rates, valid } = setup(); stage.set('report'); rates.set(undefined); TestBed.tick();
    expect(service.state().state).toBe('waiting'); expect(service.state().value).toBeUndefined();
    rates.set(emissionFactorsRates()); TestBed.tick(); expect(service.state().state).toBe('ready');
    valid.set(false); expect(service.state().value).toBeUndefined(); TestBed.tick(); expect(service.state().state).toBe('error');
    valid.set(true); service.retry(); TestBed.tick(); expect(service.state().state).toBe('ready');
  });
  it('does not reuse a previous account’s result when report and facility GUIDs match', () => {
    const { service, snapshot, stage } = setup(); stage.set('report'); TestBed.tick();
    expect(service.state().value?.other).toHaveLength(1);
    snapshot.update(value => ({ ...value, account: { ...value.account, guid: 'another-account' },
      facilities: value.facilities.map(facility => ({ ...facility, accountId: 'another-account', name: 'Another plant' })),
      meters: value.meters.filter(meter => meter.source === 'Electricity').map(meter => ({ ...meter, accountId: 'another-account' })),
      facilityReports: value.facilityReports.map(report => ({ ...report, accountId: 'another-account' })) }));
    expect(service.state().value).toBeUndefined(); TestBed.tick();
    expect(service.state().value?.facility.name).toBe('Another plant'); expect(service.state().value?.other).toEqual([]);
  });
});
