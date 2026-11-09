import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';
import { LoadingService } from '@app/core-components/loading/loading.service';
import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AnalysisCommandHandler } from '@data/account-workspace/handlers/analysis-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { AccountStatusCheckService } from '@shared/helper-services/account-status-check.service';
import { SharedDataService } from '@shared/helper-services/shared-data.service';
import { AnalysisService } from '@v0/data-evaluation/facility/analysis/analysis.service';
import { AccountAnalysisTestingModule } from './account-analysis-testing.module';
import { AccountAnalysisService } from './account-analysis.service';
import { AccountAnalysisBannerComponent } from './account-analysis-banner/account-analysis-banner.component';
import { SelectFacilityAnalysisItemsComponent } from './select-facility-analysis-items/select-facility-analysis-items.component';

function createHarness(withStatus = true) {
  const store = new AccountWorkspaceStore();
  const account = { id: 1, guid: 'account-a' } as any;
  const facility = { id: 2, guid: 'facility-a', accountId: account.guid, name: 'Facility A' } as any;
  const model = {
    id: 3, guid: 'model-a', accountId: account.guid, facilityId: facility.guid, name: 'Model A',
    analysisCategory: 'energy', energyIsSource: false, baselineYear: 2020, groups: []
  } as any;
  const analysis = {
    id: 4, guid: 'account-analysis-a', accountId: account.guid, name: 'Account analysis', analysisCategory: 'energy',
    energyIsSource: false, baselineYear: 2020,
    facilityAnalysisItems: [{ facilityId: facility.guid, analysisItemId: model.guid }]
  } as any;
  store.publish({
    account, facilities: [facility], facilityAnalyses: [model], accountAnalyses: [analysis],
    meters: [], meterData: [], meterGroups: [], predictors: [], predictorData: [], accountReports: [], facilityReports: [],
    customEmissions: [], customFuels: [], customGWPs: [], energyUseGroups: [], energyUseEquipment: []
  } as unknown as AccountWorkspaceSnapshot, { facility, accountAnalysis: analysis });
  const modelStatus = { status: 'good' };
  const goodStatus = {
    getFacilityStatusCheckByFacilityId: () => ({ getAnalysisStatusById: () => modelStatus }),
    getAccountAnalysisStatusCheckById: () => ({ accountAnalysisSetupErrors: { hasSetupErrors: false, hasError: false } })
  } as any;
  const status = new BehaviorSubject(withStatus ? goodStatus : undefined);
  const calendarizationState = new BehaviorSubject<any>({ status: 'loading' });
  const retry = vi.fn();
  TestBed.configureTestingModule({
    imports: [AccountAnalysisTestingModule],
    providers: [
      provideRouter([]),
      { provide: AccountWorkspaceStore, useValue: store },
      { provide: AccountWorkspaceService, useValue: { selectFacility: vi.fn() } },
      { provide: WorkspaceCommandBoundary, useValue: {} },
      { provide: AnalysisCommandHandler, useValue: {} },
      { provide: LoadingService, useValue: {} },
      { provide: AnalysisService, useValue: {} },
      { provide: SharedDataService, useValue: { modalOpen: new BehaviorSubject(false) } },
      { provide: AccountStatusCheckService, useValue: { accountStatusCheck: status, calendarizationState, retryCalendarization: retry } },
      { provide: AccountAnalysisService, useValue: new AccountAnalysisService() }
    ]
  });
  const selector = TestBed.createComponent(SelectFacilityAnalysisItemsComponent);
  const banner = TestBed.createComponent(AccountAnalysisBannerComponent);
  selector.detectChanges();
  banner.detectChanges();
  // Creating a second fixture replaces Angular's first root host; attach both for native focus checks.
  document.body.appendChild(selector.nativeElement);
  return { store, analysis, status, goodStatus, selector, banner, calendarizationState, retry };
}

describe('Account analysis validation presentation', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('retains the facility row, model radio, and its focus while a committed update is checked', () => {
    const h = createHarness();
    const element = h.selector.nativeElement as HTMLElement;
    const facilityButton = element.querySelector('.facility-item');
    const radio = element.querySelector('.rowToggle') as HTMLInputElement;
    radio.focus();
    expect(document.activeElement).toBe(radio);

    h.store.publishCommittedPatch({ collections: [{ collection: 'accountAnalyses', upsert: [{ ...h.analysis, isAnalysisVisited: false }] }] });
    h.status.next(undefined);
    h.selector.detectChanges();

    expect(element.querySelector('.facility-item')).toBe(facilityButton);
    expect(element.querySelector('.rowToggle')).toBe(radio);
    expect(document.activeElement).toBe(radio);
    expect(element.textContent).toContain('Model A');
    expect(element.textContent).toContain('Status unavailable');
    expect(element.textContent).not.toContain('No Issues');
    expect(element.textContent).not.toContain('No site energy analysis items found');

    h.status.next(h.goodStatus);
    h.selector.detectChanges();
    expect(element.querySelector('.rowToggle')).toBe(radio);
    expect(element.textContent).toContain('No Issues');
  });

  it('shows a recoverable check failure without removing the selection table', () => {
    const h = createHarness(false);
    const radio = h.selector.nativeElement.querySelector('.rowToggle');
    h.calendarizationState.next({ status: 'error' });
    h.selector.detectChanges();
    const element = h.selector.nativeElement as HTMLElement;
    expect(element.querySelector('.rowToggle')).toBe(radio);
    expect(element.textContent).toContain('Data checks could not finish');
    (element.querySelector('button.btn-outline-danger') as HTMLButtonElement).click();
    expect(h.retry).toHaveBeenCalledOnce();
  });

  it('shows available facilities and models before status is ready', () => {
    const h = createHarness(false);
    const element = h.selector.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.facility-item')).toHaveLength(1);
    expect(element.querySelectorAll('.rowToggle')).toHaveLength(2);
    expect(element.textContent).toContain('Model A');
    expect(element.textContent).toContain('Status unavailable');
  });

  it('keeps navigation mounted and results unavailable until fresh validation returns', () => {
    const h = createHarness();
    const element = h.banner.nativeElement as HTMLElement;
    const banner = element.querySelector('.analysis.banner');
    const results = [...element.querySelectorAll('a')].find(link => link.textContent.includes('Analysis Results'));
    expect(results.getAttribute('href')).not.toBeNull();

    h.status.next(undefined);
    h.banner.detectChanges();
    expect(element.querySelector('.analysis.banner')).toBe(banner);
    expect([...element.querySelectorAll('a')].find(link => link.textContent.includes('Analysis Results'))).toBe(results);
    expect(results.getAttribute('href')).toBeNull();
    expect(results.getAttribute('aria-disabled')).toBe('true');

    h.status.next(h.goodStatus);
    h.banner.detectChanges();
    expect(results.getAttribute('href')).not.toBeNull();
    expect(results.getAttribute('aria-disabled')).toBe('false');
  });
});
