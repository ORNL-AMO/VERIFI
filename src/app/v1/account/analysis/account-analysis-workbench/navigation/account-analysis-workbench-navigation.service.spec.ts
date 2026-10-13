import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { AccountAnalysisWorkbenchContext } from '../account-analysis-workbench-context.service';
import { buildAccountAnalysisWorkbenchStages } from '../account-analysis-workbench.models';
import {
  AccountAnalysisWorkbenchNavigationService,
  accountAnalysisNavigationRequirement
} from './account-analysis-workbench-navigation.service';
import { AccountAnalysisAutosaveService } from '../editing/account-analysis-autosave.service';
import { AccountAnalysisFacilitySelectionService } from '../select-facility-items/account-analysis-facility-selection.service';

describe('accountAnalysisNavigationRequirement', () => {
  it('blocks stage advancement until status and prerequisites are ready', () => {
    expect(accountAnalysisNavigationRequirement('setup', 'evaluating', false, false))
      .toBe('Checking analysis status before navigation is available.');
    expect(accountAnalysisNavigationRequirement('setup', 'ready', false, false))
      .toBe('Complete the analysis name and baseline year before continuing.');
    expect(accountAnalysisNavigationRequirement('select-items', 'ready', true, false, 'saved', {
      facilityCount: 2, facilityName: 'Facility A', currentAssigned: false,
      isLast: false, allAssigned: false, hasSelectedErrors: false
    })).toBe('Select a matching facility analysis or skip Facility A before continuing.');
    expect(accountAnalysisNavigationRequirement('setup', 'error', false, false))
      .toBe('Analysis status is unavailable. Retry the workspace status check before continuing.');
    expect(accountAnalysisNavigationRequirement('setup', 'ready', true, false, 'saving'))
      .toBe('Saving changes before navigation is available.');
    expect(accountAnalysisNavigationRequirement('setup', 'ready', true, false, 'invalid'))
      .toBe('Fix the validation errors before continuing.');
    expect(accountAnalysisNavigationRequirement('select-items', 'ready', true, false, 'saved', {
      facilityCount: 1, currentAssigned: true, isLast: true, allAssigned: true, hasSelectedErrors: true
    })).toBe('Resolve facility analysis errors, choose another analysis, or skip the affected facility before viewing Results.');
  });

  it('allows navigation from complete stages and all informational/result stages', () => {
    expect(accountAnalysisNavigationRequirement('setup', 'ready', true, false)).toBeUndefined();
    expect(accountAnalysisNavigationRequirement('select-items', 'ready', true, true, 'saved', {
      facilityCount: 1, currentAssigned: true, isLast: true, allAssigned: true, hasSelectedErrors: false
    })).toBeUndefined();
    expect(accountAnalysisNavigationRequirement('results', 'ready', true, true)).toBeUndefined();
    expect(accountAnalysisNavigationRequirement('used-by', 'ready', false, false)).toBeUndefined();
  });

  it('flushes drafts, moves the footer by primary stage, and switches Results tabs independently', async () => {
    const navigate = vi.fn();
    const router = {
      url: '/v1/workspace/account/account-a/analysis/workbench/analysis-a/results/monthly-chart',
      events: new Subject(),
      navigate
    };
    TestBed.configureTestingModule({
      providers: [
        AccountAnalysisWorkbenchNavigationService,
        { provide: Router, useValue: router },
        {
          provide: AccountAnalysisWorkbenchContext,
          useValue: {
            stages: signal(buildAccountAnalysisWorkbenchStages('account-a', 'analysis-a')),
            findings: signal([]),
            status: { state: signal('ready') },
            account: signal({ guid: 'account-a' }),
            analysis: signal({ guid: 'analysis-a', name: 'Analysis', baselineYear: 2020 }),
            facilities: signal([{ guid: 'facility-a' }]),
            selections: signal([{ state: 'included' }])
          }
        },
        {
          provide: AccountAnalysisAutosaveService,
          useValue: {
            draft: signal({ guid: 'analysis-a', name: 'Analysis', baselineYear: 2020 }),
            state: signal('saved'),
            flush: vi.fn().mockResolvedValue(true)
          }
        },
        {
          provide: AccountAnalysisFacilitySelectionService,
          useValue: {
            allAssigned: signal(true), selectionItems: signal([{ facility: { guid: 'facility-a' } }]),
            activeFacility: signal({ guid: 'facility-a', name: 'Facility A' }), currentAssigned: signal(true),
            isLast: signal(true), hasSelectedErrors: signal(false), focusPrevious: vi.fn(), focusNext: vi.fn()
          }
        },
        {
          provide: WorkspaceNavigationService,
          useValue: {
            accountAnalysisRoute: () => ['/dashboard'],
            accountAnalysisResultsRoute: (_account: string, _analysis: string, tab: string) => ['/results', tab]
          }
        }
      ]
    });
    const service = TestBed.inject(AccountAnalysisWorkbenchNavigationService);

    expect(service.activeStageId()).toBe('results');
    expect(service.activeResultTabId()).toBe('monthly-chart');
    await service.back();
    expect(navigate).toHaveBeenCalledWith([
      '/v1', 'workspace', 'account', 'account-a', 'analysis', 'workbench', 'analysis-a', 'select-items'
    ]);
    await service.continue();
    expect(navigate).toHaveBeenCalledWith([
      '/v1', 'workspace', 'account', 'account-a', 'analysis', 'workbench', 'analysis-a', 'used-by'
    ]);
    service.openResultTab('facility-details');
    expect(navigate).toHaveBeenCalledWith(['/results', 'facility-details']);
  });

  it('steps the Select footer through facilities before navigating to Results', async () => {
    const navigate = vi.fn();
    const focusPrevious = vi.fn().mockReturnValue(true);
    const focusNext = vi.fn().mockReturnValueOnce(true).mockReturnValueOnce(false);
    const isLast = signal(false);
    const router = {
      url: '/v1/workspace/account/account-a/analysis/workbench/analysis-a/select-items',
      events: new Subject(), navigate
    };
    TestBed.configureTestingModule({ providers: [
      AccountAnalysisWorkbenchNavigationService,
      { provide: Router, useValue: router },
      {
        provide: AccountAnalysisWorkbenchContext,
        useValue: {
          stages: signal(buildAccountAnalysisWorkbenchStages('account-a', 'analysis-a')),
          findings: signal([]), status: { state: signal('ready') },
          account: signal({ guid: 'account-a' }),
          analysis: signal({ guid: 'analysis-a', name: 'Analysis', baselineYear: 2020 })
        }
      },
      {
        provide: AccountAnalysisAutosaveService,
        useValue: {
          draft: signal({ guid: 'analysis-a', name: 'Analysis', baselineYear: 2020 }),
          state: signal('saved'), flush: vi.fn().mockResolvedValue(true)
        }
      },
      {
        provide: AccountAnalysisFacilitySelectionService,
        useValue: {
          allAssigned: signal(true), selectionItems: signal([{ facility: { guid: 'facility-a' } }, { facility: { guid: 'facility-b' } }]),
          activeFacility: signal({ guid: 'facility-a', name: 'Facility A' }), currentAssigned: signal(true),
          isLast, hasSelectedErrors: signal(false), focusPrevious, focusNext
        }
      },
      {
        provide: WorkspaceNavigationService,
        useValue: { accountAnalysisRoute: () => ['/dashboard'], accountAnalysisResultsRoute: () => ['/results', 'annual'] }
      }
    ] });
    const service = TestBed.inject(AccountAnalysisWorkbenchNavigationService);

    await service.back();
    await service.continue();
    expect(focusPrevious).toHaveBeenCalledOnce();
    expect(focusNext).toHaveBeenCalledOnce();
    expect(navigate).not.toHaveBeenCalled();

    isLast.set(true);
    await service.continue();
    expect(navigate).toHaveBeenCalledWith([
      '/v1', 'workspace', 'account', 'account-a', 'analysis', 'workbench', 'analysis-a', 'results', 'annual'
    ]);
  });
});
