import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { account, facility } from '@app/v1/facility/data/meters/facility-meters.testing';
import { WorkspaceCalendarizationService } from './workspace-calendarization.service';
import { WorkspaceStatusService } from './workspace-status.service';

describe('WorkspaceStatusService', () => {
  it('publishes ready only after the current revision evaluates successfully', () => {
    const snapshot = signal(workspaceSnapshot());
    const revision = signal(3);
    const calendarState = signal<'idle' | 'evaluating' | 'ready' | 'error'>('evaluating');
    const calendarRevision = signal<number | undefined>(undefined);
    const service = setup(snapshot, revision, calendarState, calendarRevision);

    expect(service.state()).toBe('evaluating');
    calendarRevision.set(3);
    calendarState.set('ready');
    expect(service.state()).toBe('ready');
    expect(service.evaluation()?.revision).toBe(3);
  });

  it('reports evaluator failures as errors instead of valid empty results', () => {
    const malformedReport = {
      guid: 'report-a', accountId: 'account-a', facilityId: 'facility-a', name: 'Overview', facilityReportType: 'overview'
    } as any;
    const snapshot = signal(workspaceSnapshot({ facilityReports: [malformedReport] }));
    const service = setup(snapshot, signal(1), signal('ready'), signal(1));

    expect(service.state()).toBe('error');
    expect(service.evaluation()).toBeUndefined();
  });
});

function setup(
  snapshot: WritableSignal<AccountWorkspaceSnapshot>,
  revision: WritableSignal<number>,
  calendarState: WritableSignal<'idle' | 'evaluating' | 'ready' | 'error'>,
  calendarRevision: WritableSignal<number | undefined>
): WorkspaceStatusService {
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
        useValue: { state: calendarState, revision: calendarRevision, calendarizedMeters: signal([]) }
      },
      { provide: Router, useValue: { navigate: vi.fn() } }
    ]
  });
  return TestBed.inject(WorkspaceStatusService);
}

function workspaceSnapshot(overrides: Partial<AccountWorkspaceSnapshot> = {}): AccountWorkspaceSnapshot {
  return {
    account: account(), facilities: [facility()], meters: [], meterData: [], meterGroups: [], predictors: [], predictorData: [],
    facilityAnalyses: [], accountAnalyses: [], accountReports: [], facilityReports: [], customEmissions: [], customFuels: [],
    customGWPs: [], energyUseGroups: [], energyUseEquipment: [], ...overrides
  };
}
