import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { StatusItem } from '@app/v1/status/status.models';
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

function finding(kind: StatusItem['entity']['kind'], guid: string): StatusItem {
  return {
    id: `${kind}:${guid}`, code: 'analysis.configuration.invalid', severity: 'error', category: 'readiness',
    entity: { name: guid, kind, guid, accountGuid: 'account-a', facilityGuid: 'facility-a' },
    evidence: {}, title: guid, description: 'Review setup', todo: true, destination: { kind: 'unavailable' }
  };
}

describe('FacilityAnalysisWorkbenchContext finding isolation', () => {
  it('includes only selected analysis findings and follows GUID changes independently of stage navigation', () => {
    const paramMap = new BehaviorSubject(convertToParamMap({ analysisGuid: 'analysis-a' }));
    const items = signal([
      finding('account-analysis', 'analysis-a'), finding('account-analysis', 'analysis-b'),
      finding('facility-analysis', 'analysis-a'), finding('facility-analysis', 'analysis-b'),
      finding('analysis-group', 'analysis-a:group-a'), finding('analysis-group', 'analysis-b:group-a'),
      finding('meter', 'meter-a')
    ]);
    TestBed.configureTestingModule({ providers: [
      FacilityAnalysisWorkbenchContext,
      { provide: ActivatedRoute, useValue: { paramMap, snapshot: { paramMap: paramMap.value } } },
      { provide: WorkspaceStatusService, useValue: { items, state: signal('ready') } },
      { provide: AccountWorkspaceStore, useValue: {
        account: signal({ guid: 'account-a' }), selectedFacility: signal({ guid: 'facility-a' }),
        accountAnalyses: signal([]), selectedFacilityAnalyses: signal([]), facilityMeterGroups: signal([]),
        facilities: signal([]), facilityAnalyses: signal([]), accountReports: signal([])
      } }
    ] });
    const context = TestBed.inject(FacilityAnalysisWorkbenchContext);
    expect(context.findings().map(item => item.id)).toEqual(['facility-analysis:analysis-a', 'analysis-group:analysis-a:group-a']);
    paramMap.next(convertToParamMap({ analysisGuid: 'analysis-b' }));
    expect(context.findings().map(item => item.id)).toEqual(['facility-analysis:analysis-b', 'analysis-group:analysis-b:group-a']);
  });
});
