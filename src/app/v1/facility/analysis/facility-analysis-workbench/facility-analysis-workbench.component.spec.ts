import { analysisNavigationRequirement, facilityAnalysisResultFacts } from './facility-analysis-workbench.component';

describe('facility analysis workbench navigation', () => {
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

  it('projects the report-year savings improvement into the header facts', () => {
    expect(facilityAnalysisResultFacts({
      state: 'ready', analysisGuid: 'analysis-a', fingerprint: 'fingerprint-a', reportYear: 2025,
      annual: [
        { year: 2024, totalSavingsPercentImprovement: 4.2 },
        { year: 2025, totalSavingsPercentImprovement: 8.75 }
      ] as any,
      monthly: [], groups: []
    })).toEqual({
      totalSavingsPercentImprovement: 8.75,
      unavailableMessage: undefined
    });
  });

  it.each([
    [{ state: 'loading', analysisGuid: 'analysis-a', fingerprint: 'fingerprint-b' }, 'saved', false, 'Calculating…'],
    [{ state: 'waiting', analysisGuid: 'analysis-a', reason: 'calendarization' }, 'saved', false, 'Preparing data…'],
    [{ state: 'waiting', analysisGuid: 'analysis-a', reason: 'autosave' }, 'saving', false, 'Waiting for save…'],
    [{ state: 'waiting', analysisGuid: 'analysis-a', reason: 'autosave' }, 'invalid', false, 'Setup incomplete'],
    [{ state: 'waiting', analysisGuid: 'analysis-a', reason: 'blocked' }, 'saved', false, 'Setup incomplete'],
    [{ state: 'waiting', analysisGuid: 'analysis-a', reason: 'status' }, 'saved', true, 'Setup incomplete'],
    [{ state: 'error', analysisGuid: 'analysis-a', fingerprint: 'fingerprint-b', message: 'failed' }, 'saved', false, 'Calculation failed']
  ] as const)('reports the result fact state without implying blocked work is calculating', (state, autosaveState, hasBlockingErrors, message) => {
    expect(facilityAnalysisResultFacts(state, autosaveState, hasBlockingErrors)).toEqual({ unavailableMessage: message });
  });
});
