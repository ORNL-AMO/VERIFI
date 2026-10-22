import { TestBed } from '@angular/core/testing';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { FacilityAnalysisGroupContext } from '../facility-analysis-group-context.service';
import { GroupVisualizationSession } from './group-visualization-session.service';
import { GroupVisualizationFacade } from './group-visualization.facade';
import { visualizationFixture } from './group-visualization.testing';

describe('GroupVisualizationFacade', () => {
  function setup() {
    const fixture = visualizationFixture();
    TestBed.configureTestingModule({ providers: [GroupVisualizationFacade, GroupVisualizationSession,
      { provide: FacilityAnalysisGroupContext, useValue: fixture.context },
      { provide: WorkspaceCalendarizationService, useValue: fixture.calendarization }] });
    return { ...fixture, facade: TestBed.inject(GroupVisualizationFacade) };
  }

  it('projects analysis units and site/source settings and shows all facility predictors before any model exists', () => {
    const { facade, context, calendarization } = setup();
    expect(facade.state()).toBe('ready');
    expect(calendarization.project).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({
      context: { kind: 'facility', guid: 'facility-a' }, meterGuids: ['meter-a'],
      energyUnit: 'MMBtu', waterUnit: 'kgal', energyIsSource: false, includeEmissions: false
    }));
    expect(facade.predictors()).toHaveLength(2);
    expect(facade.analysisRange()).toEqual({ start: '2024-01', end: '2024-06' });
    expect(facade.preferences().visiblePredictors).toEqual(['predictor-a']);
    expect(facade.filteredPoints()).toHaveLength(6);
    context.autosave.draft.update(analysis => ({ ...analysis, energyUnit: 'GJ', energyIsSource: true }));
    expect(facade.state()).toBe('ready');
    expect(calendarization.project).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ energyUnit: 'GJ', energyIsSource: true }));
  });

  it('keeps exploration scoped to each group, restores selections, and never modifies the analysis', () => {
    const { facade, context, update } = setup();
    const original = structuredClone(context.autosave.draft());
    expect(facade.preferences().scale).toBe('raw');
    facade.togglePredictor('predictor-b');
    const style = facade.visiblePredictors()[1].style;
    facade.update({ zoom: { start: 20, end: 80 }, scale: 'z-score' });
    expect(facade.correlations()[0].summary.pairs).toHaveLength(6);
    context.groupGuid.set('group-b');
    expect(facade.preferences().zoom).toEqual({ start: 0, end: 100 });
    expect(facade.preferences().scale).toBe('raw');
    context.groupGuid.set('group-a');
    expect(facade.preferences()).toMatchObject({ scale: 'z-score', zoom: { start: 20, end: 80 }, visiblePredictors: ['predictor-a', 'predictor-b'] });
    facade.togglePredictor('predictor-a');
    expect(facade.visiblePredictors()[0].style).toEqual(style);
    expect(context.autosave.draft()).toEqual(original);
    expect(update).not.toHaveBeenCalled();
  });

  it('falls back to the first predictor with data, preserves all-off, and removes unavailable predictors', () => {
    const { facade, context } = setup();
    context.group.update(group => ({ ...group, predictorVariables: [] }));
    expect(facade.preferences().visiblePredictors).toEqual(['predictor-a']);
    facade.togglePredictor('predictor-a');
    expect(facade.visiblePredictors()).toEqual([]);
    facade.togglePredictor('predictor-b');
    context.workbench.workspace.facilityPredictors.update(predictors => predictors.filter(predictor => predictor.guid !== 'predictor-b'));
    expect(facade.visiblePredictors()).toEqual([]);
    context.autosave.draft.update(analysis => ({ ...analysis, baselineYear: undefined }));
    expect(facade.analysisRange().start).toBe('2023-01');
    expect(facade.baselineStart()).toBeUndefined();
  });

  it('clears data while calendarization loads, exposes errors and retries current data', () => {
    const { facade, base, calendarization } = setup();
    base.next({ state: 'evaluating', meters: [] });
    expect(facade.state()).toBe('loading');
    expect(facade.points()).toEqual([]);
    base.next({ state: 'error', meters: [], error: { code: 'calculation-failed', message: 'Try again' } });
    expect(facade.state()).toBe('error');
    expect(facade.error()).toBe('Try again');
    facade.retry();
    expect(calendarization.retry).toHaveBeenCalledOnce();
  });
});
