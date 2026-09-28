import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { FacilityPredictorsWorkspaceService } from '../facility-predictors-workspace.service';
import { PredictorWorkbenchContextService } from './predictor-workbench-context.service';

describe('PredictorWorkbenchContextService', () => {
  it('resolves direct links and updates selection when route parameters change', () => {
    const parameters = new BehaviorSubject(convertToParamMap({ predictorGuid: 'predictor-a' }));
    const predictors = signal<any[]>([
      { guid: 'predictor-a', name: 'Output A' },
      { guid: 'predictor-b', name: 'Output B' }
    ]);
    const readings = signal<any[]>([
      { guid: 'reading-a', predictorId: 'predictor-a' },
      { guid: 'reading-b', predictorId: 'predictor-b' }
    ]);
    const cards = signal<any[]>(predictors().map(predictor => ({ predictor })));
    const predictorFindings = vi.fn((guid: string) => [{ id: `finding-${guid}` }]);
    TestBed.configureTestingModule({
      providers: [
        PredictorWorkbenchContextService,
        {
          provide: ActivatedRoute,
          useValue: { paramMap: parameters, snapshot: { paramMap: parameters.value } }
        },
        {
          provide: FacilityPredictorsWorkspaceService,
          useValue: { predictors, predictorReadings: readings, predictorCards: cards }
        },
        { provide: WorkspaceStatusService, useValue: { predictorFindings } }
      ]
    });

    const context = TestBed.inject(PredictorWorkbenchContextService);
    expect(context.predictor()?.guid).toBe('predictor-a');
    expect(context.readings().map(reading => reading.guid)).toEqual(['reading-a']);
    expect(context.card()?.predictor.guid).toBe('predictor-a');
    expect(context.findings()).toEqual([{ id: 'finding-predictor-a' }]);

    parameters.next(convertToParamMap({ predictorGuid: 'predictor-b' }));
    expect(context.predictor()?.guid).toBe('predictor-b');
    expect(context.readings().map(reading => reading.guid)).toEqual(['reading-b']);

    parameters.next(convertToParamMap({ predictorGuid: 'missing' }));
    expect(context.predictor()).toBeUndefined();
    expect(context.notFound()).toBe(true);
  });
});
