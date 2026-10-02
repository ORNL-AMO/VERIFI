import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { FacilityAnalysisWorkbenchContext } from './facility-analysis-workbench-context.service';

describe('FacilityAnalysisWorkbenchContext', () => {
  it('resolves the selected analysis from direct links and parameter changes', () => {
    const parameters = new BehaviorSubject(convertToParamMap({ analysisGuid: 'analysis-a' }));
    const analyses = signal([
      { guid: 'analysis-a', name: 'Analysis A', groups: [] },
      { guid: 'analysis-b', name: 'Analysis B', groups: [] }
    ] as IdbAnalysisItem[]);

    TestBed.configureTestingModule({ providers: [
      FacilityAnalysisWorkbenchContext,
      { provide: ActivatedRoute, useValue: { paramMap: parameters, snapshot: { paramMap: parameters.value } } },
      {
        provide: AccountWorkspaceStore,
        useValue: {
          account: signal({ guid: 'account-a' }),
          selectedFacility: signal({ guid: 'facility-a' }),
          selectedFacilityAnalyses: analyses,
          facilityMeterGroups: signal([])
        }
      },
      { provide: WorkspaceStatusService, useValue: { items: signal([]) } }
    ] });

    const context = TestBed.inject(FacilityAnalysisWorkbenchContext);
    expect(context.analysisGuid()).toBe('analysis-a');
    expect(context.analysis()?.name).toBe('Analysis A');

    parameters.next(convertToParamMap({ analysisGuid: 'analysis-b' }));
    expect(context.analysisGuid()).toBe('analysis-b');
    expect(context.analysis()?.name).toBe('Analysis B');

    parameters.next(convertToParamMap({ analysisGuid: 'missing' }));
    expect(context.analysis()).toBeUndefined();
  });
});
