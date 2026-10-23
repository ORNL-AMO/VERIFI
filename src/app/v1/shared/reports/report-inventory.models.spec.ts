import { getNewIdbAccountReport, IdbAccountReport } from '@data/models/idbModels/accountReport';
import { StatusItem } from '@app/v1/status/status.models';
import { reportAccount, reportFacility, reportFixture, reportSnapshot } from '@app/v1/facility/reports/testing/report-test-fixtures';
import { ACCOUNT_REPORT_TYPES, DEFAULT_REPORT_FILTERS, buildReportInventory, filterReportInventory } from './report-inventory.models';
import { FACILITY_REPORT_TYPES } from '@app/v1/facility/reports/facility-report.models';
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
    expect(entry.snapshot.facts.some(fact => fact.label === 'Reporting period')).toBe(true);
    expect(entry.snapshot.modified).toBeDefined();
    expect(entry.snapshot).not.toHaveProperty('outcomes');
  });
  it.each(FACILITY_REPORT_TYPES)('projects saved facility $value metadata', ({ value }) => {
    const data = reportSnapshot([reportFixture({ facilityReportType: value })]);
    const entry = buildReportInventory(data, [], 'ready')[0];
    expect(entry.scope).toBe('facility'); expect(entry.typeLabel).not.toBe('Unknown report type');
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
});
