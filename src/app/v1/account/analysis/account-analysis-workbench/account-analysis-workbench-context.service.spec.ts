import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { StatusItem } from '@app/v1/status/status.models';
import { AccountAnalysisWorkbenchContext } from './account-analysis-workbench-context.service';

function finding(kind: StatusItem['entity']['kind'], guid: string): StatusItem {
  return {
    id: `${kind}:${guid}`, code: 'analysis.configuration.invalid', severity: 'error', category: 'readiness',
    entity: { name: guid, kind, guid, accountGuid: 'account-a', facilityGuid: 'facility-a' },
    evidence: {}, title: guid, description: 'Review setup', todo: true, destination: { kind: 'unavailable' }
  };
}

describe('AccountAnalysisWorkbenchContext finding isolation', () => {
  it('includes only selected analysis findings and follows GUID changes independently of stage navigation', () => {
    const paramMap = new BehaviorSubject(convertToParamMap({ analysisGuid: 'analysis-a' }));
    const items = signal([
      finding('account-analysis', 'analysis-a'), finding('account-analysis', 'analysis-b'),
      finding('facility-analysis', 'analysis-a'), finding('facility-analysis', 'analysis-b'),
      finding('analysis-group', 'analysis-a:group-a'), finding('analysis-group', 'analysis-b:group-a'),
      finding('meter', 'meter-a')
    ]);
    TestBed.configureTestingModule({ providers: [
      AccountAnalysisWorkbenchContext,
      { provide: ActivatedRoute, useValue: { paramMap, snapshot: { paramMap: paramMap.value } } },
      { provide: WorkspaceStatusService, useValue: { items, state: signal('ready') } },
      { provide: AccountWorkspaceStore, useValue: {
        account: signal({ guid: 'account-a' }), selectedFacility: signal({ guid: 'facility-a' }),
        accountAnalyses: signal([]), selectedFacilityAnalyses: signal([]), facilityMeterGroups: signal([]),
        facilities: signal([]), facilityAnalyses: signal([]), accountReports: signal([])
      } }
    ] });
    const context = TestBed.inject(AccountAnalysisWorkbenchContext);
    expect(context.findings().map(item => item.id)).toEqual(['account-analysis:analysis-a']);
    paramMap.next(convertToParamMap({ analysisGuid: 'analysis-b' }));
    expect(context.findings().map(item => item.id)).toEqual(['account-analysis:analysis-b']);
  });
});
