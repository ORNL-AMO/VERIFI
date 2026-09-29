import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountCommandHandler } from '@data/account-workspace/handlers/account-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { account, facility } from '@app/v1/facility/data/meters/facility-meters.testing';
import { WorkspaceCalendarizationBaseResult } from '@app/v1/shared/calendarization/workspace-calendarization.models';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { BehaviorSubject } from 'rxjs';
import { WorkspaceStatusService } from './workspace-status.service';
import { presentFinding } from './status.catalog';
import { makeFinding } from './status.models';

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

  it('persists warning discard and restore while retaining raw findings', async () => {
    const snapshot = signal(workspaceSnapshot({ account: account({ name: 'New Account' }) }));
    const service = setup(snapshot, signal(1), new BehaviorSubject(result('ready')));
    const warning = service.items().find(item => item.code === 'account.configuration.default-name');
    expect(warning).toBeDefined();

    await expect(service.discardWarning(warning!)).resolves.toBe(true);

    expect(service.rawFindings().some(item => item.id === warning!.id)).toBe(true);
    expect(service.items().some(item => item.id === warning!.id)).toBe(false);
    expect(service.discardedItems().map(item => item.id)).toContain(warning!.id);
    expect(snapshot().account.statusWarningDismissals).toHaveLength(1);

    await expect(service.restoreWarning(service.discardedItems()[0])).resolves.toBe(true);
    expect(service.items().map(item => item.id)).toContain(warning!.id);
    expect(snapshot().account.statusWarningDismissals).toEqual([]);
  });

  it('does not persist errors and leaves warnings visible when persistence fails', async () => {
    const snapshot = signal(workspaceSnapshot({ account: account({ name: 'New Account' }) }));
    const service = setup(snapshot, signal(1), new BehaviorSubject(result('ready')), new Error('save failed'));
    const warning = service.items().find(item => item.code === 'account.configuration.default-name');
    const error = service.items().find(item => item.severity === 'error');

    await expect(service.discardWarning(error!)).resolves.toBe(false);
    await expect(service.discardWarning(warning!)).resolves.toBe(false);

    expect(service.items().map(item => item.id)).toContain(warning!.id);
    expect(snapshot().account.statusWarningDismissals).toBeUndefined();
    expect(service.warningActionError()).toBe('save failed');

    snapshot.update(current => ({
      ...current,
      account: account({ guid: 'account-b', name: 'Other Account' })
    }));
    expect(service.warningActionError()).toBeUndefined();

    snapshot.update(current => ({
      ...current,
      account: account({ guid: 'account-a', name: 'New Account' })
    }));
    expect(service.warningActionError()).toBe('save failed');
  });

  it('does not let a late account action clear a newer account action', async () => {
    const snapshot = signal(workspaceSnapshot({ account: account({ name: 'New Account' }) }));
    const calendarResult = new BehaviorSubject(result('ready'));
    const completions: Array<() => void> = [];
    const execute = vi.fn(() => new Promise(resolve => {
      completions.push(() => resolve({ value: undefined, change: {} }));
    }));
    const service = setup(snapshot, signal(1), calendarResult, undefined, execute);
    const firstWarning = service.items().find(item => item.code === 'account.configuration.default-name');

    const firstAction = service.discardWarning(firstWarning!);
    expect(service.warningActionId()).toBe(firstWarning!.id);

    snapshot.update(current => ({
      ...current,
      account: account({ guid: 'account-b', name: 'New Account' })
    }));
    calendarResult.next(result('ready', 'account-b'));
    expect(service.warningActionId()).toBeUndefined();
    expect(service.canManageWarnings()).toBe(true);
    const secondWarning = service.items().find(item => item.code === 'account.configuration.default-name');
    const secondAction = service.discardWarning(secondWarning!);
    expect(service.warningActionId()).toBe(secondWarning!.id);

    completions[0]();
    await firstAction;
    expect(service.warningActionId()).toBe(secondWarning!.id);

    completions[1]();
    await secondAction;
    expect(service.warningActionId()).toBeUndefined();
  });

  it('navigates facility and Predictor destinations to their v1 data workflows', () => {
    const snapshot = signal(workspaceSnapshot());
    const service = setup(snapshot, signal(1), new BehaviorSubject(result('ready')));
    const router = TestBed.inject(Router) as unknown as { navigate: ReturnType<typeof vi.fn> };
    const facilityEntity = { kind: 'facility' as const, guid: 'facility-a', name: 'Facility A', accountGuid: 'account-a', facilityGuid: 'facility-a' };
    const predictorEntity = { kind: 'predictor' as const, guid: 'predictor-a', name: 'Production', accountGuid: 'account-a', facilityGuid: 'facility-a' };

    service.navigateTo(presentFinding(makeFinding('facility.predictors.missing', 'error', 'readiness', facilityEntity)));
    service.navigateTo(presentFinding(makeFinding('predictor.quality.outlier', 'warning', 'quality', predictorEntity, { count: 1, periods: ['2026-01'] })));

    expect(router.navigate).toHaveBeenNthCalledWith(1, ['/v1', 'workspace', 'facility', 'facility-a', 'data', 'predictors']);
    expect(router.navigate).toHaveBeenNthCalledWith(2, ['/v1', 'workspace', 'facility', 'facility-a', 'data', 'predictors', 'predictor-a', 'quality']);
  });
});

function setup(
  snapshot: WritableSignal<AccountWorkspaceSnapshot>,
  revision: WritableSignal<number>,
  calendarResult: BehaviorSubject<WorkspaceCalendarizationBaseResult>,
  commandError?: Error,
  commandExecute?: (...args: any[]) => Promise<any>
): WorkspaceStatusService {
  const calendarizeBase = vi.fn(() => calendarResult.asObservable());
  const accountHandler = {
    update: vi.fn(async (updatedAccount: AccountWorkspaceSnapshot['account']) => updatedAccount)
  };
  const commandBoundary = {
    execute: commandExecute ?? vi.fn(async (_request: unknown, persist: () => Promise<AccountWorkspaceSnapshot['account']>) => {
      if (commandError) throw commandError;
      const value = await persist();
      snapshot.update(current => ({ ...current, account: value }));
      return { value, change: {} };
    })
  };
  TestBed.configureTestingModule({
    providers: [
      WorkspaceStatusService,
      {
        provide: AccountWorkspaceStore,
        useValue: {
          isReady: signal(true), snapshot, revision,
          selectedFacility: signal(facility()), account: () => snapshot().account,
          canWrite: signal(true), hasPending: signal(false)
        }
      },
      {
        provide: WorkspaceCalendarizationService,
        useValue: { calendarizeBase, currentInputFingerprint: signal('fingerprint-a') }
      },
      { provide: Router, useValue: { navigate: vi.fn() } },
      { provide: AccountCommandHandler, useValue: accountHandler },
      { provide: WorkspaceCommandBoundary, useValue: commandBoundary }
    ]
  });
  const service = TestBed.inject(WorkspaceStatusService);
  expect(calendarizeBase).toHaveBeenCalledOnce();
  return service;
}

function result(
  state: WorkspaceCalendarizationBaseResult['state'],
  accountGuid = 'account-a'
): WorkspaceCalendarizationBaseResult {
  return {
    state,
    accountGuid: state === 'ready' ? accountGuid : undefined,
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
