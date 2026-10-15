import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { StatusItem } from '@app/v1/status/status.models';
import { FACILITY_REPORT_TYPES, buildFacilityReportCard, filterFacilityReportCards, ReportFilters } from './facility-report.models';
import { reportFixture } from './testing/report-test-fixtures';

describe('facility report inventory projections', () => {
  const filters: ReportFilters = { search: '', type: 'all', status: 'all', sort: 'attention' };

  it.each(FACILITY_REPORT_TYPES)('presents saved $label configuration independently of migration availability', ({ value, label }) => {
    const card = buildFacilityReportCard(reportFixture({ facilityReportType: value }), [], [], 'ready');
    expect(card.status).toBe('ready');
    expect(card.view.icon).toBe('report');
    expect(card.view.chips?.map(chip => chip.label)).toContain(label);
    expect(card.view.notes?.[0].label).toContain('later migration');
  });

  it('tolerates absent legacy settings and invalid dates without changing the saved record', () => {
    const report = reportFixture({ dataOverviewReportSettings: undefined, facilityReportType: 'overview', modifiedDate: new Date('invalid') });
    const card = buildFacilityReportCard(report, [], [], 'ready');
    expect(card.searchText).toContain('not set');
    expect(card.modified).toBe(0);
    expect(report.dataOverviewReportSettings).toBeUndefined();
  });

  it('distinguishes failed or unfinished validation from valid setup', () => {
    expect(buildFacilityReportCard(reportFixture(), [], [], 'error').status).toBe('unavailable');
    expect(buildFacilityReportCard(reportFixture(), [], [], 'evaluating').status).toBe('checking');
    expect(buildFacilityReportCard(reportFixture(), [], [], 'idle').status).toBe('checking');
  });

  it('filters by report type, configuration status, analysis name, and saved period', () => {
    const report = reportFixture({ analysisItemId: 'analysis-a' });
    report.analysisReportSettings.reportYear = 2024;
    const finding = { id: 'warning', severity: 'warning', description: 'Review analysis', entity: {
      kind: 'facility-report', guid: report.guid, facilityGuid: report.facilityId, accountGuid: report.accountId
    } } as StatusItem;
    const card = buildFacilityReportCard(report, [{ guid: 'analysis-a', facilityId: report.facilityId, name: 'Steam model' } as IdbAnalysisItem], [finding], 'ready');
    expect(card.status).toBe('warning');
    for (const search of ['steam model', '2024', 'saved report']) {
      expect(filterFacilityReportCards([card], { ...filters, search })).toEqual([card]);
    }
    expect(filterFacilityReportCards([card], { ...filters, type: 'overview' })).toEqual([]);
    expect(filterFacilityReportCards([card], { ...filters, status: 'error' })).toEqual([]);
  });

  it('orders errors first and breaks name ties deterministically; supports date and name sorting', () => {
    const a = buildFacilityReportCard(reportFixture({ guid: 'a', name: 'Zebra' }), [], [], 'ready');
    const b = buildFacilityReportCard(reportFixture({ guid: 'b', name: 'Alpha', facilityReportType: 'unknown' as never, modifiedDate: new Date(2026, 0, 1) }), [], [], 'ready');
    const c = buildFacilityReportCard(reportFixture({ guid: 'c', name: 'Alpha' }), [], [], 'ready');
    expect(filterFacilityReportCards([a, c, b], filters).map(card => card.report.guid)).toEqual(['b', 'c', 'a']);
    expect(filterFacilityReportCards([a, c, b], { ...filters, sort: 'name' }).map(card => card.report.guid)).toEqual(['b', 'c', 'a']);
    expect(filterFacilityReportCards([a, b], { ...filters, sort: 'modified' })[0]).toBe(b);
  });
});
