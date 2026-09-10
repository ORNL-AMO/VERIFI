import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountStatusCheckService } from '@shared/helper-services/account-status-check.service';
import { group, meter, reading } from './facility-meters.testing';
import { FacilityMetersWorkspaceService } from './facility-meters-workspace.service';

describe('FacilityMetersWorkspaceService', () => {
  it('exposes selected meter context from the current meter route', () => {
    const events = new Subject<unknown>();
    const meters = signal([
      meter({ guid: 'meter-a', name: 'Electric Main', groupId: 'group-a' }),
      meter({ guid: 'meter-b', name: 'Water Main', groupId: undefined, source: 'Water Intake' })
    ]);
    const meterData = signal([
      reading({ guid: 'reading-a', meterId: 'meter-a' }),
      reading({ guid: 'reading-b', meterId: 'meter-a' })
    ]);
    const meterGroups = signal([
      group({ guid: 'group-a', name: 'Purchased Electricity' })
    ]);

    TestBed.configureTestingModule({
      providers: [
        FacilityMetersWorkspaceService,
        {
          provide: Router,
          useValue: {
            url: '/v1/workspace/facility/facility-a/data/meters/meter-a/monthly',
            events
          }
        },
        {
          provide: AccountWorkspaceStore,
          useValue: {
            account: signal({ guid: 'account-a', name: 'Account A' }),
            selectedFacility: signal({ guid: 'facility-a', name: 'Facility A' }),
            canWrite: signal(true),
            hasPending: signal(false),
            facilityMeters: meters,
            facilityMeterData: meterData,
            facilityMeterGroups: meterGroups
          }
        },
        {
          provide: AccountStatusCheckService,
          useValue: {
            selectedFacilityStatusCheck$: of({ metersStatusChecks: [] })
          }
        }
      ]
    });

    const service = TestBed.inject(FacilityMetersWorkspaceService);

    expect(service.selectedMeterGuid()).toBe('meter-a');
    expect(service.selectedMeter()?.name).toBe('Electric Main');
    expect(service.selectedMeterCard()?.meter.guid).toBe('meter-a');
    expect(service.selectedMeterCard()?.firstReadingLabel).toBe('Jan 2026');
    expect(service.selectedMeterGroup()?.name).toBe('Purchased Electricity');
    expect(service.selectedMeterReadingCount()).toBe(2);

    events.next(new NavigationEnd(
      1,
      '/v1/workspace/facility/facility-a/data/meters/meter-b/settings',
      '/v1/workspace/facility/facility-a/data/meters/meter-b/settings'
    ));

    expect(service.selectedMeterGuid()).toBe('meter-b');
    expect(service.selectedMeter()?.name).toBe('Water Main');
    expect(service.selectedMeterCard()?.meter.guid).toBe('meter-b');
    expect(service.selectedMeterReadingCount()).toBe(0);

    events.next(new NavigationEnd(
      2,
      '/v1/workspace/facility/facility-a/data/meters/meter-missing/settings',
      '/v1/workspace/facility/facility-a/data/meters/meter-missing/settings'
    ));

    expect(service.selectedMeterGuid()).toBe('meter-missing');
    expect(service.selectedMeter()).toBeUndefined();
    expect(service.selectedMeterCard()).toBeUndefined();
  });
});
