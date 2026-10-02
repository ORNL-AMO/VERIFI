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

  it('projects the latest complete year and its total savings improvement into the header facts', () => {
    expect(facilityAnalysisResultFacts({
      state: 'ready', analysisGuid: 'analysis-a', fingerprint: 'fingerprint-a', reportYear: 2025,
      annual: [
        { year: 2024, totalSavingsPercentImprovement: 4.2 },
        { year: 2025, totalSavingsPercentImprovement: 8.75 }
      ] as any,
      monthly: [], groups: []
    })).toEqual({
      latestCompleteYear: 2025,
      totalSavingsPercentImprovement: 8.75,
      pending: false
    });
  });

  it('reports pending facts without carrying stale calculated values', () => {
    expect(facilityAnalysisResultFacts({
      state: 'loading', analysisGuid: 'analysis-a', fingerprint: 'fingerprint-b'
    })).toEqual({ pending: true });
  });
});
