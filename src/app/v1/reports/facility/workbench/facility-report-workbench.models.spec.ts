import { FACILITY_REPORT_TYPES } from '../facility-report.models';
import { reportFixture } from '../testing/report-test-fixtures';
import { buildFacilityReportStages, facilityReportStage } from './facility-report-workbench.models';

describe('facility report workflow stages', () => {
  it.each(FACILITY_REPORT_TYPES)('provides the applicable $label workflow without completing pending content', ({ value }) => {
    const report = reportFixture({ facilityReportType: value });
    const stages = buildFacilityReportStages(report, 'report');
    expect(stages.map(stage => stage.id)).toEqual(['analysis', 'savings', 'costSavings'].includes(value)
      ? ['setup', 'data-checks', 'report'] : ['setup', 'report']);
    expect(stages.every(stage => stage.canOpen && !stage.completed)).toBe(true);
    expect(stages.filter(stage => stage.current).map(stage => stage.id)).toEqual(['report']);
    expect(stages.at(-1)?.route).toEqual(['/v1', 'workspace', 'facility', 'facility-a', 'reports', 'workbench', 'report-a', 'report']);
  });
  it.each(FACILITY_REPORT_TYPES)('labels the $label report stage and validates only Setup', ({ value, label }) => {
    const report = reportFixture({ facilityReportType: value });
    for (const status of ['ready', 'error', 'warning', 'checking', 'unavailable'] as const) {
      const stages = buildFacilityReportStages(report, 'setup', status);
      expect(stages[0].completed).toBe(status === 'ready');
      expect(stages[0].hasBlockingErrors).toBe(status === 'error');
      expect(stages.slice(1).every(stage => !stage.completed && !stage.hasBlockingErrors && stage.canOpen)).toBe(true);
      expect(stages.at(-1)?.label).toBe(`${label} Report`);
    }
  });
  it('canonicalizes an absent or unknown stage to Setup', () => {
    expect(facilityReportStage()).toBe('setup');
    expect(facilityReportStage('unknown')).toBe('setup');
  });
});
