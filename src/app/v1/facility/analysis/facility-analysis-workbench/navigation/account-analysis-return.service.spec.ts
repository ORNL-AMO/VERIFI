import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { vi } from 'vitest';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { FacilityAnalysisWorkbenchContext } from '../facility-analysis-workbench-context.service';
import { AccountAnalysisReturnService, readAccountAnalysisReturnOrigin } from './account-analysis-return.service';

describe('AccountAnalysisReturnService', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('parses only complete GUID-based origins', () => {
    expect(readAccountAnalysisReturnOrigin(convertToParamMap({
      returnAccountGuid: 'account-a', returnAccountAnalysisGuid: 'analysis-a', returnFacilityGuid: 'facility-a'
    }))).toEqual({ accountGuid: 'account-a', accountAnalysisGuid: 'analysis-a', facilityGuid: 'facility-a' });
    expect(readAccountAnalysisReturnOrigin(convertToParamMap({ returnAccountGuid: 'account-a' }))).toBeUndefined();
  });

  it('returns to the canonical Select Facility Items route and restores facility focus', async () => {
    const navigate = vi.fn().mockResolvedValue(true);
    TestBed.configureTestingModule({ providers: [
      AccountAnalysisReturnService,
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { queryParamMap: convertToParamMap({
          returnAccountGuid: 'account-a', returnAccountAnalysisGuid: 'analysis-a', returnFacilityGuid: 'facility-a'
        }) } }
      },
      { provide: Router, useValue: { navigate } },
      {
        provide: WorkspaceNavigationService,
        useValue: { accountAnalysisWorkbenchRoute: () => ['/account-analysis', 'select-items'] }
      },
      {
        provide: FacilityAnalysisWorkbenchContext,
        useValue: {
          account: signal({ guid: 'account-a' }), facility: signal({ guid: 'facility-a' }),
          workspace: { accountAnalyses: signal([{ guid: 'analysis-a', accountId: 'account-a' }]) }
        }
      }
    ] });
    const service = TestBed.inject(AccountAnalysisReturnService);

    expect(service.origin()).toBeDefined();
    expect(await service.returnToAccountAnalysis()).toBe(true);
    expect(navigate).toHaveBeenCalledWith(['/account-analysis', 'select-items'], {
      queryParams: { facilityGuid: 'facility-a' }
    });
  });

  it('returns contribution drill-ins to the Account Analysis Facility Contributions tab', async () => {
    const navigate = vi.fn().mockResolvedValue(true);
    TestBed.configureTestingModule({ providers: [
      AccountAnalysisReturnService,
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { queryParamMap: convertToParamMap({
          returnAccountGuid: 'account-a', returnAccountAnalysisGuid: 'analysis-a', returnFacilityGuid: 'facility-a',
          returnAccountResultTab: 'facility-contributions'
        }) } }
      },
      { provide: Router, useValue: { navigate } },
      {
        provide: WorkspaceNavigationService,
        useValue: { accountAnalysisResultsRoute: () => ['/account-analysis', 'results', 'facility-contributions'] }
      },
      {
        provide: FacilityAnalysisWorkbenchContext,
        useValue: {
          account: signal({ guid: 'account-a' }), facility: signal({ guid: 'facility-a' }),
          workspace: { accountAnalyses: signal([{ guid: 'analysis-a', accountId: 'account-a' }]) }
        }
      }
    ] });

    expect(await TestBed.inject(AccountAnalysisReturnService).returnToAccountAnalysis()).toBe(true);
    expect(navigate).toHaveBeenCalledWith(['/account-analysis', 'results', 'facility-contributions']);
  });

  it('returns facility details drill-ins to the Account Analysis Facility Details tab', async () => {
    const navigate = vi.fn().mockResolvedValue(true);
    TestBed.configureTestingModule({ providers: [
      AccountAnalysisReturnService,
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { queryParamMap: convertToParamMap({
          returnAccountGuid: 'account-a', returnAccountAnalysisGuid: 'analysis-a', returnFacilityGuid: 'facility-a',
          returnAccountResultTab: 'facility-details'
        }) } }
      },
      { provide: Router, useValue: { navigate } },
      {
        provide: WorkspaceNavigationService,
        useValue: { accountAnalysisResultsRoute: () => ['/account-analysis', 'results', 'facility-details'] }
      },
      {
        provide: FacilityAnalysisWorkbenchContext,
        useValue: {
          account: signal({ guid: 'account-a' }), facility: signal({ guid: 'facility-a' }),
          workspace: { accountAnalyses: signal([{ guid: 'analysis-a', accountId: 'account-a' }]) }
        }
      }
    ] });

    expect(await TestBed.inject(AccountAnalysisReturnService).returnToAccountAnalysis()).toBe(true);
    expect(navigate).toHaveBeenCalledWith(['/account-analysis', 'results', 'facility-details']);
  });

  it('suppresses stale and cross-account origins', () => {
    TestBed.configureTestingModule({ providers: [
      AccountAnalysisReturnService,
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { queryParamMap: convertToParamMap({
          returnAccountGuid: 'other-account', returnAccountAnalysisGuid: 'analysis-a', returnFacilityGuid: 'facility-a'
        }) } }
      },
      { provide: Router, useValue: { navigate: vi.fn() } },
      { provide: WorkspaceNavigationService, useValue: {} },
      {
        provide: FacilityAnalysisWorkbenchContext,
        useValue: {
          account: signal({ guid: 'account-a' }), facility: signal({ guid: 'facility-a' }),
          workspace: { accountAnalyses: signal([{ guid: 'analysis-a', accountId: 'account-a' }]) }
        }
      }
    ] });
    expect(TestBed.inject(AccountAnalysisReturnService).origin()).toBeUndefined();
  });
});
