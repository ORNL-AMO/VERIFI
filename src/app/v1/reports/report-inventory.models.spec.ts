import { getNewIdbAccountReport, IdbAccountReport } from '@data/models/idbModels/accountReport';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { StatusItem } from '@app/v1/status/status.models';
import { reportAccount, reportFacility, reportFixture, reportSnapshot } from '@app/v1/reports/facility/testing/report-test-fixtures';
import { ACCOUNT_REPORT_TYPES, reportTypeChoices, reportTypePresentation, DEFAULT_REPORT_FILTERS, buildReportInventory, filterReportInventory } from './report-inventory.models';
import { FACILITY_REPORT_TYPES } from '@app/v1/reports/facility/facility-report.models';
import { makeFinding } from '@app/v1/status/status.models';
import { presentFinding } from '@app/v1/status/status.catalog';
import { resolveReportStatusItem } from '@app/v1/status/report-status-destination';

function snapshot() {
  const source = reportSnapshot();
  return { ...source, accountReports: [{ ...getNewIdbAccountReport(reportAccount, [reportFacility], []), id: 4, guid: 'report-a', name: 'Saved report', reportType: 'analysis' as const, reportYear: 2024, analysisReportSetup: { analysisItemId: 'account-analysis' } as any }] as IdbAccountReport[],
    accountAnalyses: [{ guid: 'account-analysis', accountId: reportAccount.guid, name: 'Linked account analysis', facilityAnalysisItems: [] }] as any };
}
describe('report inventory projections', () => {
  it('projects scope-qualified status actions and explicit pending reasons into report cards', () => {
    const data = snapshot();
    const findings = (['account-report', 'facility-report'] as const).flatMap(kind => [
      makeFinding('report.configuration.invalid', 'error', 'configuration', { kind, guid: 'report-a', accountGuid: 'account-a', facilityGuid: kind === 'facility-report' ? 'facility-a' : undefined, name: 'Saved report' }, { reasons: ['missingName', 'missingReportYear'] }),
      makeFinding('report.dates.invalid', 'error', 'configuration', { kind, guid: 'report-a', accountGuid: 'account-a', facilityGuid: kind === 'facility-report' ? 'facility-a' : undefined, name: 'Saved report' })
    ]).map(item => resolveReportStatusItem(presentFinding(item), data));
    const entries = buildReportInventory(data, findings, 'ready');
    for (const entry of entries) {
      const config = entry.snapshot.findings.find(item => item.action)!;
      expect(config.action!.label).toBe('Review name');
      expect(config.action!.route).toEqual(['/v1', 'workspace', entry.scope, entry.scope === 'account' ? 'account-a' : 'facility-a', 'reports', 'workbench', 'report-a', 'setup']);
      expect(config.description).toContain('Other report settings are pending migration.');
      expect(entry.snapshot.findings.find(item => !item.action)?.unavailableReason).toBe('Report date settings are pending migration.');
    }
  });
  it('keeps matching GUIDs distinct across scopes and includes only owned records', () => {
    const data = snapshot();
    data.accountReports.push({ ...data.accountReports[0], accountId: 'account-b' });
    const entries = buildReportInventory({ ...data, facilityReports: [...data.facilityReports,
      reportFixture({ guid: 'wrong-account', accountId: 'account-b' }), reportFixture({ guid: 'orphan', facilityId: 'missing' })] }, [], 'ready');
    expect(entries).toHaveLength(2);
    expect(new Set(entries.map(entry => entry.key)).size).toBe(2);
    expect(entries.map(entry => entry.scope)).toEqual(['account', 'facility']);
    expect(entries[0].snapshot.facts).toContainEqual({ label: 'Analysis', value: 'Linked account analysis' });
  });
  it.each(ACCOUNT_REPORT_TYPES)('projects saved account $value metadata without requiring results', ({ value }) => {
    const data = snapshot(); data.accountReports[0].reportType = value as any;
    const entry = buildReportInventory(data, [], 'ready')[0];
    expect(entry.typeLabel).not.toBe('Unknown report type');
    expect(entry.snapshot.contentPending).toBe(value !== 'betterPlants');
    expect(entry.snapshot.facts.some(fact => fact.label === 'Reporting period')).toBe(true);
    expect(entry.snapshot.modified).toBeDefined();
    expect(entry.snapshot).not.toHaveProperty('outcomes');
  });
  it.each(FACILITY_REPORT_TYPES)('projects saved facility $value metadata', ({ value, label }) => {
    const data = reportSnapshot([reportFixture({ facilityReportType: value })]);
    const entry = buildReportInventory(data, [], 'ready')[0];
    expect(entry.scope).toBe('facility'); expect(entry.typeLabel).toBe(label);
    expect(entry.snapshot.contentPending).toBe(true);
  });
  it('keeps missing legacy facility settings and invalid modification dates explicit in the inventory', () => {
    const report = reportFixture({ facilityReportType: 'overview', dataOverviewReportSettings: undefined, modifiedDate: new Date('invalid') });
    const entry = buildReportInventory(reportSnapshot([report]), [], 'ready')[0];
    expect(entry.modified).toBe(0);
    expect(entry.snapshot.modified).toBe('Date unavailable');
    expect(entry.snapshot.facts).toEqual([{ label: 'Reporting period', value: 'Not set – Not set' }]);
    expect(filterReportInventory([entry], { ...DEFAULT_REPORT_FILTERS, search: 'not set' })).toEqual([entry]);
    expect(report.dataOverviewReportSettings).toBeUndefined();
    expect(Number.isNaN(report.modifiedDate.getTime())).toBe(true);
  });
  it('shows missing dates and analyses explicitly and distinguishes unavailable checks from readiness', () => {
    const data = snapshot(); data.accountReports[0].reportYear = undefined;
    data.accountAnalyses = [];
    const ready = buildReportInventory(data, [], 'ready')[0];
    expect(ready.snapshot.facts).toContainEqual({ label: 'Reporting period', value: 'Not set' });
    expect(ready.snapshot.facts).toContainEqual({ label: 'Analysis', value: 'Linked analysis unavailable' });
    expect(buildReportInventory(data, [], 'error').every(entry => entry.status === 'unavailable')).toBe(true);
    expect(buildReportInventory(data, [], 'evaluating').every(entry => entry.status === 'checking')).toBe(true);
    expect(buildReportInventory(data, [], 'ready').every(entry => entry.statusLabel === 'Setup ready')).toBe(true);
  });
  it.each([
    { selections: ['linked-analysis', 'skip', undefined, ''], count: 1 },
    { selections: ['skip', undefined, ''], count: 0 },
    { selections: undefined, count: 0 }
  ])('counts only saved facility analysis GUIDs ($count selections)', ({ selections, count }) => {
    const data = snapshot();
    data.accountAnalyses[0].facilityAnalysisItems = selections?.map((analysisItemId, index) => ({ facilityId: `facility-${index}`, analysisItemId }));
    expect(buildReportInventory(data, [], 'ready')[0].snapshot.scopeLabel).toBe(`${count} saved facility analysis selection(s)`);
  });
  it('preserves hidden impact reports and scopes their availability across both levels', () => {
    const data = snapshot();
    data.accountReports[0].reportType = 'betterClimate';
    data.accountReports.push({ ...data.accountReports[0], guid: 'factors', reportType: 'accountEmissionFactors' });
    const withFactors = { ...data, facilityReports: [reportFixture({ facilityReportType: 'emissionFactors' })] };
    expect(buildReportInventory(withFactors, [], 'ready')).toHaveLength(3);
    expect(buildReportInventory({ ...withFactors, account: { ...reportAccount, displayEmissions: false } }, [], 'ready')).toEqual([]);
    expect(withFactors.accountReports).toHaveLength(2);
  });
  it('filters across names, owner, type, analysis, period and orders account reports first before attention', () => {
    const data = snapshot();
    const findings = [{ id: 'facility-error', title: 'Invalid setup', description: 'Select analysis', severity: 'error', destination: { kind: 'unavailable' }, entity: { kind: 'facility-report', guid: 'report-a', accountGuid: 'account-a', facilityGuid: 'facility-a' } }] as StatusItem[];
    const entries = buildReportInventory(data, findings, 'ready');
    expect(filterReportInventory(entries, DEFAULT_REPORT_FILTERS).map(entry => entry.scope)).toEqual(['account', 'facility']);
    expect(filterReportInventory(entries, { ...DEFAULT_REPORT_FILTERS, sort: 'attention' })[0].scope).toBe('facility');
    for (const search of ['linked account analysis', '2024', 'account a']) expect(filterReportInventory(entries, { ...DEFAULT_REPORT_FILTERS, search }).map(entry => entry.scope)).toEqual(['account']);
    expect(filterReportInventory(entries, { ...DEFAULT_REPORT_FILTERS, search: 'facility a' }).map(entry => entry.scope)).toEqual(['facility']);
    expect(filterReportInventory(entries, { ...DEFAULT_REPORT_FILTERS, type: 'facility:analysis', status: 'error' })).toHaveLength(1);
    expect(filterReportInventory(entries, { ...DEFAULT_REPORT_FILTERS, scope: 'account', status: 'error' })).toEqual([]);
  });

  it('filters saved facility report analysis, period, type and setup status through the unified inventory', () => {
    const report = reportFixture({ analysisItemId: 'analysis-a' });
    report.analysisReportSettings.reportYear = 2024;
    const data = {
      ...reportSnapshot([report]),
      facilityAnalyses: [{ guid: 'analysis-a', accountId: report.accountId, facilityId: report.facilityId, name: 'Steam model' } as IdbAnalysisItem]
    };
    const finding = { id: 'warning', severity: 'warning', description: 'Review analysis', destination: { kind: 'unavailable' }, entity: {
      kind: 'facility-report', guid: report.guid, facilityGuid: report.facilityId, accountGuid: report.accountId
    } } as StatusItem;
    const entries = buildReportInventory(data, [finding], 'ready');

    for (const search of ['steam model', '2024', 'saved report']) {
      expect(filterReportInventory(entries, { ...DEFAULT_REPORT_FILTERS, search })).toEqual(entries);
    }
    expect(filterReportInventory(entries, { ...DEFAULT_REPORT_FILTERS, type: 'facility:overview' })).toEqual([]);
    expect(filterReportInventory(entries, { ...DEFAULT_REPORT_FILTERS, status: 'error' })).toEqual([]);
    expect(filterReportInventory(entries, { ...DEFAULT_REPORT_FILTERS, type: 'facility:analysis', status: 'warning' })).toEqual(entries);
  });

  it('orders facility reports by attention, date or name with deterministic identity ties', () => {
    const reports = [
      reportFixture({ guid: 'a', name: 'Zebra' }),
      reportFixture({ guid: 'c', name: 'Alpha' }),
      reportFixture({ guid: 'b', name: 'Alpha', facilityReportType: 'unknown' as never, modifiedDate: new Date(2026, 0, 1) })
    ];
    const entries = buildReportInventory(reportSnapshot(reports), [], 'ready');

    for (const sort of ['attention', 'name'] as const) {
      expect(filterReportInventory(entries, { ...DEFAULT_REPORT_FILTERS, sort }).map(entry => entry.report.guid)).toEqual(['b', 'c', 'a']);
    }
    expect(filterReportInventory(entries, { ...DEFAULT_REPORT_FILTERS, sort: 'modified' })[0].report.guid).toBe('b');
  });
});

describe('single-facility report choices', () => {
  it('retains every qualified command type and distinguishes overlapping formats', () => {
    const choices = reportTypeChoices(true, true);
    expect(new Set(choices.map(item => item.value))).toEqual(new Set([
      ...ACCOUNT_REPORT_TYPES.map(item => `account:${item.value}`),
      ...FACILITY_REPORT_TYPES.map(item => `facility:${item.value}`)
    ]));
    for (const type of ['Analysis', 'Data Overview', 'Emission Factors', 'Savings']) {
      const formats = choices.filter(item => item.typeLabel === type);
      expect(formats.map(item => item.formatLabel).sort()).toEqual(['Account format', 'Facility format']);
      expect(formats.every(item => item.label === `${type} — ${item.formatLabel}`)).toBe(true);
    }
    expect(choices.find(item => item.type === 'betterPlants')?.label).toBe('Better Plants');
    expect(choices.find(item => item.type === 'modeling')?.formatLabel).toBeUndefined();
    expect(reportTypePresentation('facility', 'overview', true).label).toBe('Data Overview — Facility format');
    expect(reportTypePresentation('account', 'analysis', false).label).toBe('Analysis');
    expect(reportTypeChoices(true, false).some(item => ['betterClimate', 'accountEmissionFactors', 'emissionFactors'].includes(item.type))).toBe(false);
  });
});
