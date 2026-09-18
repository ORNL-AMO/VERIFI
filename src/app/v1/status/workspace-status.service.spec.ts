import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { account, facility } from '@app/v1/facility/data/meters/facility-meters.testing';
import { WorkspaceCalendarizationBaseResult } from '@app/v1/shared/calendarization/workspace-calendarization.models';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { BehaviorSubject } from 'rxjs';
import { WorkspaceStatusService } from './workspace-status.service';

describe('WorkspaceStatusService', () => {
  it('publishes ready only after the current revision evaluates successfully', () => {
    const snapshot = signal(workspaceSnapshot());
    const revision = signal(3);
    const calendarResult = new BehaviorSubject<WorkspaceCalendarizationBaseResult>(result('evaluating'));
    const service = setup(snapshot, revision, calendarResult);

    expect(service.state()).toBe('evaluating');
    calendarResult.next(result('ready'));
    expect(service.state()).toBe('ready');
    expect(service.evaluation()?.revision).toBe(3);
  });

  it('reports evaluator failures as errors instead of valid empty results', () => {
    const malformedReport = {
      guid: 'report-a', accountId: 'account-a', facilityId: 'facility-a', name: 'Overview', facilityReportType: 'overview'
    } as any;
    const snapshot = signal(workspaceSnapshot({ facilityReports: [malformedReport] }));
    const service = setup(snapshot, signal(1), new BehaviorSubject(result('ready')));

    expect(service.state()).toBe('error');
    expect(service.evaluation()).toBeUndefined();
  });
});

function setup(
  snapshot: WritableSignal<AccountWorkspaceSnapshot>,
  revision: WritableSignal<number>,
  calendarResult: BehaviorSubject<WorkspaceCalendarizationBaseResult>
): WorkspaceStatusService {
  const calendarizeBase = vi.fn(() => calendarResult.asObservable());
  TestBed.configureTestingModule({
    providers: [
      WorkspaceStatusService,
      {
        provide: AccountWorkspaceStore,
        useValue: {
          isReady: signal(true), snapshot, revision,
          selectedFacility: signal(facility()), account: () => snapshot().account
        }
      },
      {
        provide: WorkspaceCalendarizationService,
        useValue: { calendarizeBase, currentInputFingerprint: signal('fingerprint-a') }
      },
      { provide: Router, useValue: { navigate: vi.fn() } }
    ]
  });
  const service = TestBed.inject(WorkspaceStatusService);
  expect(calendarizeBase).toHaveBeenCalledOnce();
  return service;
}

function result(state: WorkspaceCalendarizationBaseResult['state']): WorkspaceCalendarizationBaseResult {
  return {
    state,
    accountGuid: state === 'ready' ? 'account-a' : undefined,
    inputFingerprint: state === 'ready' ? 'fingerprint-a' : undefined,
    meters: []
  };
}

function workspaceSnapshot(overrides: Partial<AccountWorkspaceSnapshot> = {}): AccountWorkspaceSnapshot {
  return {
    account: account(), facilities: [facility()], meters: [], meterData: [], meterGroups: [], predictors: [], predictorData: [],
    facilityAnalyses: [], accountAnalyses: [], accountReports: [], facilityReports: [], customEmissions: [], customFuels: [],
    customGWPs: [], energyUseGroups: [], energyUseEquipment: [], ...overrides
  };
}
