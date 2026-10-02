import { TestBed } from '@angular/core/testing';
import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { BehaviorSubject } from 'rxjs';
import { AccountStatusCheckService } from './account-status-check.service';
import { CalanderizationService, CalendarizationState } from './calanderization.service';

describe('AccountStatusCheckService', () => {
  let calendarizationState: BehaviorSubject<CalendarizationState>;
  let retry: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    calendarizationState = new BehaviorSubject<CalendarizationState>({ status: 'idle' });
    retry = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        AccountWorkspaceStore,
        AccountStatusCheckService,
        {
          provide: CalanderizationService,
          useValue: { calendarizationState, recalculateCurrentWorkspace: retry }
        }
      ]
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('does not calculate status from idle, loading, or a ready result for another snapshot', () => {
    const store = TestBed.inject(AccountWorkspaceStore);
    const service = TestBed.inject(AccountStatusCheckService);
    store.publish(createSnapshot('account-a'));
    TestBed.flushEffects();
    const snapshot = store.snapshot();

    calendarizationState.next({
      status: 'loading', accountGuid: 'account-a', workspaceRevision: 0, requestId: 1, workspaceSnapshot: snapshot
    });
    vi.advanceTimersByTime(300);
    expect(service.accountStatusCheck.value).toBeUndefined();

    calendarizationState.next({
      status: 'ready', accountGuid: 'account-a', workspaceRevision: 0, requestId: 1,
      workspaceSnapshot: createSnapshot('account-a'), calanderizedMeters: []
    });
    vi.advanceTimersByTime(300);
    expect(service.accountStatusCheck.value).toBeUndefined();
  });

  it('calculates only from the ready result matching the active account and revision', () => {
    const store = TestBed.inject(AccountWorkspaceStore);
    const service = TestBed.inject(AccountStatusCheckService);
    store.publish(createSnapshot('account-a'));
    TestBed.flushEffects();
    const snapshot = store.snapshot();

    calendarizationState.next({
      status: 'ready', accountGuid: 'account-a', workspaceRevision: store.revision(), requestId: 2,
      workspaceSnapshot: snapshot, calanderizedMeters: []
    });
    vi.advanceTimersByTime(300);

    expect(service.accountStatusCheck.value).toBeDefined();
    service.retryCalendarization();
    expect(retry).toHaveBeenCalledOnce();
  });
});

function createSnapshot(accountGuid: string): AccountWorkspaceSnapshot {
  return {
    account: { guid: accountGuid, name: 'Existing Account' } as any,
    facilities: [], meters: [], meterData: [], meterGroups: [], predictors: [], predictorData: [],
    facilityAnalyses: [], accountAnalyses: [], accountReports: [], facilityReports: [],
    customEmissions: [], customFuels: [], customGWPs: [], energyUseGroups: [], energyUseEquipment: []
  };
}
