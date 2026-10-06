import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { StatusItem } from '@app/v1/status/status.models';
import { FacilityAnalysisAutosaveService } from '../editing/facility-analysis-autosave.service';
import { FacilityAnalysisWorkbenchContext } from '../facility-analysis-workbench-context.service';
import { AnalysisWorkbenchStage } from '../facility-analysis-workbench.models';
import {
  FacilityAnalysisWorkbenchNavigationService,
  analysisNavigationRequirement
} from './facility-analysis-workbench-navigation.service';

describe('FacilityAnalysisWorkbenchNavigationService', () => {
  it('explains each condition that disables the wizard action', () => {
    expect(analysisNavigationRequirement('saving', 'analysis', false, 'group', true)).toBe('Saving changes before navigation is available.');
    expect(analysisNavigationRequirement('invalid', 'analysis', false, 'group', true)).toBe('Fix the validation errors before continuing.');
    expect(analysisNavigationRequirement('error', 'analysis', false, 'group', true)).toBe('Retry or discard the unsaved changes before continuing.');
    expect(analysisNavigationRequirement('saved', 'analysis', true, 'group', false)).toBe('Resolve the errors in Analysis Setup before continuing.');
    expect(analysisNavigationRequirement('saved', 'analysis', false, 'facility', false)).toBe('Add and complete an analysis group before viewing Facility Results.');
    expect(analysisNavigationRequirement('saved', 'group', true, 'facility', false)).toBe('Complete all analysis groups before viewing Facility Results.');
  });

  it('allows group-to-group navigation regardless of current group errors', () => {
    expect(analysisNavigationRequirement('saved', 'group', true, 'group', true)).toBeUndefined();
    expect(analysisNavigationRequirement('idle', 'used-by', true, undefined, undefined)).toBeUndefined();
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
            facility: signal({ guid: 'facility-a' }),
            analysis: signal(undefined),
            status: { state: signal('ready') }
          }
        },
        {
          provide: FacilityAnalysisAutosaveService,
          useValue: { state: signal('saved'), draft: signal(undefined), isBlocked: signal(false) }
        },
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

  it('redirects locked facility results to the first incomplete group', () => {
    const navigate = vi.fn();
    configureReadyNavigation(
      '/v1/workspace/facility/facility-a/analysis/workbench/analysis-a/facility/annual',
      [finding('analysis-group', 'analysis-a:group-a')],
      navigate
    );
    TestBed.flushEffects();

    expect(navigate).toHaveBeenCalledWith(['/group-a'], { replaceUrl: true });
  });

  it('redirects a locked group deep link to Analysis Setup', () => {
    const navigate = vi.fn();
    configureReadyNavigation(
      '/v1/workspace/facility/facility-a/analysis/workbench/analysis-a/group/group-b/setup',
      [finding('facility-analysis', 'analysis-a')],
      navigate
    );
    TestBed.flushEffects();

    expect(navigate).toHaveBeenCalledWith(['/setup'], { replaceUrl: true });
  });

  it('redirects locked Facility Results to Setup before considering incomplete groups', () => {
    const navigate = vi.fn();
    configureReadyNavigation(
      '/v1/workspace/facility/facility-a/analysis/workbench/analysis-a/facility/annual',
      [
        finding('facility-analysis', 'analysis-a'),
        finding('analysis-group', 'analysis-a:group-a')
      ],
      navigate
    );
    TestBed.flushEffects();

    expect(navigate).toHaveBeenCalledWith(['/setup'], { replaceUrl: true });
  });

  it('backs out of early Used By to the nearest previous accessible stage', () => {
    const navigate = vi.fn();
    const navigation = configureReadyNavigation(
      '/v1/workspace/facility/facility-a/analysis/workbench/analysis-a/used-by',
      [finding('facility-analysis', 'analysis-a')],
      navigate
    );

    navigation.back();

    expect(navigate).toHaveBeenCalledWith(['/setup']);
  });
});

const analysis = {
  guid: 'analysis-a',
  groups: [
    { idbGroupId: 'group-a', analysisType: 'regression' },
    { idbGroupId: 'group-b', analysisType: 'regression' }
  ]
} as IdbAnalysisItem;

const stages: readonly AnalysisWorkbenchStage[] = [
  { id: 'analysis', kind: 'analysis', label: 'Analysis Setup', route: ['/setup'] },
  { id: 'group:group-a', kind: 'group', label: 'Group A', groupGuid: 'group-a', route: ['/group-a'] },
  { id: 'group:group-b', kind: 'group', label: 'Group B', groupGuid: 'group-b', route: ['/group-b'] },
  { id: 'facility', kind: 'facility', label: 'Facility Results', route: ['/facility'] },
  { id: 'used-by', kind: 'used-by', label: 'Used By', route: ['/used-by'] }
];

function configureReadyNavigation(
  url: string,
  findings: readonly StatusItem[],
  navigate: ReturnType<typeof vi.fn>
): FacilityAnalysisWorkbenchNavigationService {
  TestBed.configureTestingModule({
    providers: [
      FacilityAnalysisWorkbenchNavigationService,
      { provide: Router, useValue: { url, events: new Subject<NavigationEnd>(), navigate } },
      {
        provide: FacilityAnalysisWorkbenchContext,
        useValue: {
          stages: signal(stages),
          analysisGuid: signal('analysis-a'),
          findings: signal(findings),
          facility: signal({ guid: 'facility-a' }),
          analysis: signal(analysis),
          status: { state: signal('ready') }
        }
      },
      {
        provide: FacilityAnalysisAutosaveService,
        useValue: { state: signal('saved'), draft: signal(analysis), isBlocked: signal(false) }
      },
      { provide: WorkspaceNavigationService, useValue: { facilityAnalysisRoute: vi.fn(() => ['/analyses']) } }
    ]
  });
  return TestBed.inject(FacilityAnalysisWorkbenchNavigationService);
}

function finding(kind: 'facility-analysis' | 'analysis-group', guid: string): StatusItem {
  return {
    id: `${kind}:${guid}`,
    code: kind === 'facility-analysis' ? 'analysis.configuration.invalid' : 'analysis-group.setup.invalid',
    severity: 'error',
    category: 'configuration',
    entity: { kind, guid, name: 'Analysis', accountGuid: 'account-a', facilityGuid: 'facility-a' },
    evidence: {},
    title: 'Complete setup',
    description: 'Complete setup.',
    todo: true,
    destination: { kind: 'unavailable' }
  };
}
