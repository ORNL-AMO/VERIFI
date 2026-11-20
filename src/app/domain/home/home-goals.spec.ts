import { homeGoalContext, homeGoalResult } from './home-goals';
import { analysisFixture } from '../visualizations/testing/analysis-fixtures';
import { calculateFacilityAnalysisResults } from '../calculations/analysis-calculations/facility-analysis-results-calculation';
import { homeSnapshot } from '@app/v1/home/testing/home-testing';
import type { FacilityVisualizationResults } from '../visualizations/analysis/facility-analysis-source';

describe('Home goals', () => {
  it('keeps goal readiness independent from reporting selection, including wrong category and foreign owner', () => {
    let snapshot = homeSnapshot(); const owner = {kind: 'facility' as const, guid: 'facility-a'};
    const binding = {kind: 'reporting' as const, owner, category: 'energy' as const};
    snapshot.facilities[0].sustainabilityQuestions.energyReductionGoal = false;
    expect(homeGoalContext(binding, snapshot)).toMatchObject({ goal: {state: 'missing'}, resolved: {state: 'setup-required'} });
    const fixture = analysisFixture();
    const selected = {...fixture.analysis, guid: 'selected', accountId: 'account-a', facilityId: 'facility-a', analysisCategory: 'water' as const};
    snapshot = {...snapshot, facilityAnalyses: [selected], facilities: snapshot.facilities.map(f => ({...f, selectedEnergyAnalysisId: 'selected'}))};
    expect(homeGoalContext(binding, snapshot).resolved.state).toBe('missing-source');
    selected.analysisCategory = 'energy' as any; selected.facilityId = 'foreign';
    expect(homeGoalContext(binding, snapshot).resolved.state).toBe('missing-source');
  });
  it.each([0, -12, 50])('preserves improvement %s and unbounded target attainment', improvement => {
    const fixture = analysisFixture(), calculated = calculateFacilityAnalysisResults(fixture.request);
    const value: FacilityVisualizationResults = {scope: 'facility', analysis: fixture.analysis, facility: fixture.facility, annual: [], groups: [], groupOnly: false,
      monthly: [{...calculated.monthlyAnalysisSummaryData[0], date: new Date(2024, 3, 1), rolling12MonthImprovement: improvement, missingValueWarning: false, missingPredictors: []}]};
    expect(homeGoalResult(value, 25)).toMatchObject({state: 'ready', improvement, towardTarget: improvement * 4});
    expect(homeGoalResult(value, 0)).toMatchObject({towardTarget: undefined});
    value.monthly[0].missingValueWarning = true;
    expect(homeGoalResult(value, 25)).toMatchObject({partial: true, towardTarget: undefined});
    value.monthly[0].rolling12MonthImprovement = NaN;
    expect(homeGoalResult(value, 25).state).toBe('empty');
  });
});
