import {
  facilityAnalysisDependencyMessage,
  facilityAnalysisResultFacts
} from './facility-analysis-workbench-header.component';

describe('facility analysis workbench header', () => {
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

  it('summarizes downstream dependency counts with natural singular and plural labels', () => {
    expect(facilityAnalysisDependencyMessage(0, 0, 0)).toBeUndefined();
    expect(facilityAnalysisDependencyMessage(1, 0, 0)).toBe('Changes can affect 1 account analysis.');
    expect(facilityAnalysisDependencyMessage(2, 1, 3)).toBe(
      'Changes can affect 2 account analyses, 1 report, and 3 banking consumers.'
    );
  });
});
