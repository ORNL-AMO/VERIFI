import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { WorkspaceCalendarizationBaseResult } from '@app/v1/shared/calendarization/workspace-calendarization.models';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { presentFinding } from '@app/v1/status/status.catalog';
import { makeFinding } from '@app/v1/status/status.models';
import { group, meter, reading } from './facility-meters.testing';
import { FacilityMetersWorkspaceService } from './facility-meters-workspace.service';

describe('FacilityMetersWorkspaceService', () => {
  it('exposes selected meter context from the current meter route', () => {
    const events = new Subject<unknown>();
    const { service } = setupService(events);

    expect(service.selectedMeterGuid()).toBe('meter-a');
    expect(service.selectedMeter()?.name).toBe('Electric Main');
    expect(service.selectedMeterCard()?.statusLabel).toBe('Needs review');
    expect(service.selectedMeterGroup()?.name).toBe('Purchased Electricity');
    expect(service.selectedMeterReadingCount()).toBe(2);

    events.next(new NavigationEnd(1, '', '/v1/workspace/facility/facility-a/data/meters/meter-b/settings'));
    expect(service.selectedMeterGuid()).toBe('meter-b');
    expect(service.selectedMeter()?.name).toBe('Water Main');
    expect(service.selectedMeterReadingCount()).toBe(0);

    events.next(new NavigationEnd(2, '', '/v1/workspace/facility/facility-a/data/meters/meter-missing/settings'));
    expect(service.selectedMeter()).toBeUndefined();
    expect(service.selectedMeterCard()).toBeUndefined();
  });

  it('projects the shared canonical result into meter display settings', () => {
    const events = new Subject<unknown>();
    const currentMeter = meter({ guid: 'meter-a', name: 'Electric Main', groupId: 'group-a' });
    const calendarizedMeters = [
      { meter: currentMeter, monthlyData: [] }
    ] as any[];
    const { service, calendarizeBase, project } = setupService(events, calendarizedMeters);

    expect(service.calendarizationState()).toBe('ready');
    expect(service.calendarizedMeters().map(item => item.meter.guid)).toEqual(['meter-a']);
    expect(calendarizeBase).toHaveBeenCalledOnce();
    expect(project).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      context: { kind: 'facility', guid: 'facility-a' }, includeEmissions: false
    }));
  });

  it('reprojects a facility switch without requesting another base calculation', () => {
    const events = new Subject<unknown>();
    const { service, calendarizeBase, project, selectedFacility } = setupService(events);

    selectedFacility.set(facilityValue({ guid: 'facility-b', name: 'Facility B' }));
    TestBed.flushEffects();
    service.calendarizationState();
    service.calendarizedMeters();

    expect(calendarizeBase).toHaveBeenCalledOnce();
    expect(project).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({
      context: { kind: 'facility', guid: 'facility-b' }
    }));
  });
});

function setupService(events: Subject<unknown>, calendarizedMeters: any[] = []): {
  service: FacilityMetersWorkspaceService;
  calendarizeBase: ReturnType<typeof vi.fn>;
  project: ReturnType<typeof vi.fn>;
  selectedFacility: { set(value: ReturnType<typeof facilityValue>): void };
} {
  const meterA = meter({ guid: 'meter-a', name: 'Electric Main', groupId: 'group-a' });
  const statusEntity = { kind: 'meter' as const, guid: meterA.guid, name: meterA.name, accountGuid: meterA.accountId, facilityGuid: meterA.facilityId };
  const calendarizeBase = vi.fn(() => of(calendarizationResult(calendarizedMeters)));
  const project = vi.fn((_base, request) => ({
    state: 'ready', accountGuid: 'account-a', inputFingerprint: 'fingerprint-a',
    projection: { context: request.context },
    meters: request.meterGuids
      ? calendarizedMeters.filter(item => request.meterGuids.includes(item.meter.guid))
      : calendarizedMeters
  }));
  const selectedFacility = signal(facilityValue());
  TestBed.configureTestingModule({
    providers: [
      FacilityMetersWorkspaceService,
      { provide: Router, useValue: { url: '/v1/workspace/facility/facility-a/data/meters/meter-a/readings', events } },
      {
        provide: AccountWorkspaceStore,
        useValue: {
          account: signal({ guid: 'account-a', name: 'Account A' }),
          selectedFacility,
          canWrite: signal(true),
          hasPending: signal(false),
          facilityMeters: signal([meterA, meter({ guid: 'meter-b', name: 'Water Main', source: 'Water Intake' })]),
          facilityMeterData: signal([
            reading({ guid: 'reading-a', meterId: 'meter-a' }),
            reading({ guid: 'reading-b', meterId: 'meter-a', month: 2 })
          ]),
          facilityMeterGroups: signal([group({ guid: 'group-a', name: 'Purchased Electricity' })])
        }
      },
      {
        provide: WorkspaceStatusService,
        useValue: {
          state: signal('ready'),
          items: signal([presentFinding(makeFinding('meter.currency.stale', 'warning', 'currency', statusEntity, { latestPeriod: '2026-02', thresholdMonths: 3 }))])
        }
      },
      { provide: WorkspaceCalendarizationService, useValue: { calendarizeBase, project } }
    ]
  });
  const service = TestBed.inject(FacilityMetersWorkspaceService);
  TestBed.flushEffects();
  return { service, calendarizeBase, project, selectedFacility };
}

function calendarizationResult(meters: any[]): WorkspaceCalendarizationBaseResult {
  return {
    state: 'ready',
    accountGuid: 'account-a',
    inputFingerprint: 'fingerprint-a',
    meters
  };
}

function facilityValue(overrides = {}) {
  return {
    guid: 'facility-a', accountId: 'account-a', name: 'Facility A', energyUnit: 'kWh', volumeLiquidUnit: 'kgal',
    volumeGasUnit: 'CCF', massUnit: 'lb', energyIsSource: false, fiscalYear: 'calendarYear' as const,
    fiscalYearMonth: 0, fiscalYearCalendarEnd: true, ...overrides
  } as any;
}
