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

describe('accountAnalysisNavigationRequirement', () => {
  it('blocks stage advancement until status and prerequisites are ready', () => {
    expect(accountAnalysisNavigationRequirement('setup', 'evaluating', false, false))
      .toBe('Checking analysis status before navigation is available.');
    expect(accountAnalysisNavigationRequirement('setup', 'ready', false, false))
      .toBe('Complete the analysis name and baseline year before continuing.');
    expect(accountAnalysisNavigationRequirement('select-items', 'ready', true, false))
      .toBe('Select a valid facility analysis or skip every facility before viewing Results.');
    expect(accountAnalysisNavigationRequirement('setup', 'error', false, false))
      .toBe('Analysis status is unavailable. Retry the workspace status check before continuing.');
  });

  it('allows navigation from complete stages and all informational/result stages', () => {
    expect(accountAnalysisNavigationRequirement('setup', 'ready', true, false)).toBeUndefined();
    expect(accountAnalysisNavigationRequirement('select-items', 'ready', true, true)).toBeUndefined();
    expect(accountAnalysisNavigationRequirement('results', 'ready', true, true)).toBeUndefined();
    expect(accountAnalysisNavigationRequirement('used-by', 'ready', false, false)).toBeUndefined();
  });

  it('moves the footer by primary stage and switches Results tabs independently', () => {
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
            readiness: signal({ statusReady: true, setupComplete: true, selectionsComplete: true }),
            findings: signal([]),
            status: { state: signal('ready') },
            account: signal({ guid: 'account-a' }),
            analysis: signal({ guid: 'analysis-a' })
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
    service.back();
    expect(navigate).toHaveBeenCalledWith([
      '/v1', 'workspace', 'account', 'account-a', 'analysis', 'workbench', 'analysis-a', 'select-items'
    ]);
    service.continue();
    expect(navigate).toHaveBeenCalledWith([
      '/v1', 'workspace', 'account', 'account-a', 'analysis', 'workbench', 'analysis-a', 'used-by'
    ]);
    service.openResultTab('facility-details');
    expect(navigate).toHaveBeenCalledWith(['/results', 'facility-details']);
  });
});
