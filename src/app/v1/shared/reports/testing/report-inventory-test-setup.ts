import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { getNewIdbAccountReport } from '@data/models/idbModels/accountReport';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { AccountReportActionsService } from '@app/v1/account/reports/account-report-actions.service';
import { FacilityReportActionsService } from '@app/v1/facility/reports/facility-report-actions.service';
import { AccountReportsModule } from '@app/v1/account/reports/account-reports.module';
import { reportAccount, reportFacility, reportFixture, reportSnapshot } from '@app/v1/facility/reports/testing/report-test-fixtures';
import { ReportsModule } from '../reports.module';

export async function setupReportInventory(scope: 'account' | 'facility' = 'account') {
  const store = new AccountWorkspaceStore();
  const accountReport = { ...getNewIdbAccountReport(reportAccount, [reportFacility], []), id: 5, guid: 'account-report', name: 'Account saved report', reportType: 'analysis' as const, reportYear: 2024 };
  store.publish({ ...reportSnapshot(), accountReports: [accountReport] }, { facility: reportFacility });
  const state = signal<any>(scope === 'facility' ? { facilityGuid: 'facility-a' } : { accountGuid: 'account-a' });
  const status = signal<'ready' | 'error' | 'idle' | 'evaluating'>('ready');
  const accountActions = { create: vi.fn(async () => ({ ...accountReport, guid: 'created-account' })), copy: vi.fn(async () => ({ ...accountReport, guid: 'copied-account' })), updateName: vi.fn(async () => accountReport), delete: vi.fn(async () => {}) };
  const facilityActions = { create: vi.fn(async () => reportFixture({ guid: 'created-facility' })), copy: vi.fn(async () => reportFixture({ guid: 'copied-facility' })), updateName: vi.fn(async () => reportFixture()), delete: vi.fn(async () => {}) };
  const navigation = { routeState: state, activeReportGuid: computed(() => state().reportGuid),
    accountReportsRoute: (guid: string) => ['/v1', 'workspace', 'account', guid, 'reports', 'dashboard'],
    facilityReportsRoute: (guid: string) => ['/v1', 'workspace', 'facility', guid, 'reports', 'dashboard'],
    accountReportWorkbenchRoute: (account: string, report: string) => ['/v1', 'workspace', 'account', account, 'reports', 'workbench', report, 'setup'],
    facilityReportWorkbenchRoute: (facility: string, report: string) => ['/v1', 'workspace', 'facility', facility, 'reports', 'workbench', report, 'setup'] };
  await TestBed.configureTestingModule({ imports: [ReportsModule, AccountReportsModule], providers: [provideRouter([]),
    { provide: AccountWorkspaceStore, useValue: store }, { provide: WorkspaceNavigationService, useValue: navigation },
    { provide: WorkspaceStatusService, useValue: { state: status, items: signal([]) } },
    { provide: AccountReportActionsService, useValue: accountActions }, { provide: FacilityReportActionsService, useValue: facilityActions }
  ] }).compileComponents();
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  return { store, accountReport, state, status, accountActions, facilityActions, navigation, navigate };
}
