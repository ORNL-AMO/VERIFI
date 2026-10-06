import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { FacilityAnalysisAutosaveService } from '../editing/facility-analysis-autosave.service';
import { FacilityAnalysisWorkbenchContext } from '../facility-analysis-workbench-context.service';
import {
  FacilityAnalysisWorkbenchNavigationService,
  analysisNavigationRequirement
} from './facility-analysis-workbench-navigation.service';

describe('FacilityAnalysisWorkbenchNavigationService', () => {
  it('explains each condition that disables the wizard action', () => {
    expect(analysisNavigationRequirement('saving', false, true)).toBe('Saving changes before navigation is available.');
    expect(analysisNavigationRequirement('invalid', false, true)).toBe('Fix the validation errors before continuing.');
    expect(analysisNavigationRequirement('error', false, true)).toBe('Retry or discard the unsaved changes before continuing.');
    expect(analysisNavigationRequirement('saved', true, true)).toBe('Resolve the errors in this stage before continuing.');
  });

  it('allows navigation when the stage is ready and lets Finish ignore earlier-stage findings', () => {
    expect(analysisNavigationRequirement('saved', false, true)).toBeUndefined();
    expect(analysisNavigationRequirement('idle', true, false)).toBeUndefined();
  });

  it('tracks the active stage from redirected router navigation', () => {
    const events = new Subject<NavigationEnd>();
    TestBed.configureTestingModule({
      providers: [
        FacilityAnalysisWorkbenchNavigationService,
        {
          provide: Router,
          useValue: {
            url: '/v1/workspace/facility/facility-a/analysis/workbench/analysis-a/setup',
            events,
            navigate: vi.fn()
          }
        },
        {
          provide: FacilityAnalysisWorkbenchContext,
          useValue: {
            stages: signal([]),
            analysisGuid: signal('analysis-a'),
            findings: signal([]),
            facility: signal({ guid: 'facility-a' })
          }
        },
        { provide: FacilityAnalysisAutosaveService, useValue: { state: signal('saved') } },
        { provide: WorkspaceNavigationService, useValue: { facilityAnalysisRoute: vi.fn(() => ['/analyses']) } }
      ]
    });

    const navigation = TestBed.inject(FacilityAnalysisWorkbenchNavigationService);
    expect(navigation.activeStageId()).toBe('analysis');

    events.next(new NavigationEnd(
      1,
      '/v1/workspace/facility/facility-a/analysis/workbench/analysis-a/setup',
      '/v1/workspace/facility/facility-a/analysis/workbench/analysis-a/group/group-a/monthly'
    ));

    expect(navigation.activeStageId()).toBe('group:group-a');
  });
});
