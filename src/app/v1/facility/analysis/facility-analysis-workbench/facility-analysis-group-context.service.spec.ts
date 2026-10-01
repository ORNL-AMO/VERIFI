import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { FacilityAnalysisAutosaveService } from './facility-analysis-autosave.service';
import { FacilityAnalysisGroupContext } from './facility-analysis-group-context.service';
import { FacilityAnalysisWorkbenchContext } from './facility-analysis-workbench-context.service';

describe('FacilityAnalysisGroupContext', () => {
  it('resolves the selected group from direct links and parameter changes', () => {
    const parameters = new BehaviorSubject(convertToParamMap({ groupGuid: 'group-a' }));
    const draft = signal<any>({
      guid: 'analysis-a',
      groups: [
        { idbGroupId: 'group-a', analysisType: 'regression' },
        { idbGroupId: 'group-b', analysisType: 'absoluteEnergyConsumption' }
      ]
    });
    const meterGroups = signal<any[]>([
      { guid: 'group-a', name: 'Group A' },
      { guid: 'group-b', name: 'Group B' }
    ]);

    TestBed.configureTestingModule({ providers: [
      FacilityAnalysisGroupContext,
      { provide: ActivatedRoute, useValue: { paramMap: parameters, snapshot: { paramMap: parameters.value } } },
      { provide: FacilityAnalysisAutosaveService, useValue: { draft } },
      {
        provide: FacilityAnalysisWorkbenchContext,
        useValue: {
          meterGroups,
          status: { items: signal([]) },
          workspace: { facilityMeters: signal([]) }
        }
      }
    ] });

    const context = TestBed.inject(FacilityAnalysisGroupContext);
    expect(context.groupGuid()).toBe('group-a');
    expect(context.group()?.analysisType).toBe('regression');
    expect(context.meterGroup()?.name).toBe('Group A');

    parameters.next(convertToParamMap({ groupGuid: 'group-b' }));
    expect(context.groupGuid()).toBe('group-b');
    expect(context.group()?.analysisType).toBe('absoluteEnergyConsumption');
    expect(context.meterGroup()?.name).toBe('Group B');
  });
});
