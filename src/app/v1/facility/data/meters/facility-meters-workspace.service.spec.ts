import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { presentFinding } from '@app/v1/status/status.catalog';
import { makeFinding } from '@app/v1/status/status.models';
import { group, meter, reading } from './facility-meters.testing';
import { FacilityMetersWorkspaceService } from './facility-meters-workspace.service';

describe('FacilityMetersWorkspaceService', () => {
  it('exposes selected meter context from the current meter route', () => {
    const events = new Subject<unknown>();
    const service = setupService(events);

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

  it('reuses account-wide calendarization and filters it to the selected facility', () => {
    const events = new Subject<unknown>();
    const currentMeter = meter({ guid: 'meter-a', name: 'Electric Main', groupId: 'group-a' });
    const otherMeter = meter({ guid: 'meter-other', facilityId: 'facility-b' });
    const calendarizedMeters = signal([
      { meter: currentMeter, monthlyData: [] },
      { meter: otherMeter, monthlyData: [] }
    ] as any[]);
    const service = setupService(events, calendarizedMeters);

    expect(service.calendarizationState()).toBe('ready');
    expect(service.calendarizedMeters().map(item => item.meter.guid)).toEqual(['meter-a']);
  });
});

function setupService(events: Subject<unknown>, calendarizedMeters = signal<any[]>([])): FacilityMetersWorkspaceService {
  const meterA = meter({ guid: 'meter-a', name: 'Electric Main', groupId: 'group-a' });
  const statusEntity = { kind: 'meter' as const, guid: meterA.guid, name: meterA.name, accountGuid: meterA.accountId, facilityGuid: meterA.facilityId };
  TestBed.configureTestingModule({
    providers: [
      FacilityMetersWorkspaceService,
      { provide: Router, useValue: { url: '/v1/workspace/facility/facility-a/data/meters/meter-a/readings', events } },
      {
        provide: AccountWorkspaceStore,
        useValue: {
          account: signal({ guid: 'account-a', name: 'Account A' }),
          selectedFacility: signal({ guid: 'facility-a', name: 'Facility A' }),
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
          items: signal([presentFinding(makeFinding('meter.currency.stale', 'warning', 'currency', statusEntity, { latestPeriod: '2026-02', thresholdMonths: 3 }))]),
          calendarizedMeters
        }
      }
    ]
  });
  return TestBed.inject(FacilityMetersWorkspaceService);
}
