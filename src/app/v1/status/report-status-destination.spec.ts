import { accountReportSnapshot } from '@app/v1/account/reports/testing/account-report-test-fixtures';
import { reportFixture } from '@app/v1/facility/reports/testing/report-test-fixtures';
import { ACCOUNT_REPORT_TYPES } from '@app/v1/shared/reports/report-inventory.models';
import { FACILITY_REPORT_TYPES } from '@app/v1/facility/reports/facility-report.models';
import { accountReportAnalysisSetupKey } from '@data/account-workspace/account-report-setup.models';
import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { StatusRuleCode, makeFinding } from './status.models';
import { presentFinding } from './status.catalog';
import { resolveReportStatusItem } from './report-status-destination';
import { statusFindingEvidenceSignature } from './status.dismissals';

function finding(scope: 'account' | 'facility', code: StatusRuleCode = 'report.configuration.invalid', reasons = ['missingName']) {
  return presentFinding(makeFinding(code, code === 'report.analysis.warning' ? 'warning' : 'error', 'configuration', {
    kind: scope === 'account' ? 'account-report' : 'facility-report', accountGuid: 'account-a',
    facilityGuid: scope === 'facility' ? 'facility-a' : undefined,
    guid: scope === 'account' ? 'account-report' : 'report-a', name: 'Saved report'
  }, { reasons }));
}

describe('report status destinations', () => {
  it.each(['account', 'facility'] as const)('opens %s name setup without changing finding identity, evidence or dismissal signatures', scope => {
    const snapshot = accountReportSnapshot(), item = finding(scope), before = structuredClone(snapshot);
    const resolved = resolveReportStatusItem(item, snapshot);
    expect(resolved.destination).toEqual(scope === 'account'
      ? { kind: 'account-report-setup', accountGuid: 'account-a', reportGuid: 'account-report' }
      : { kind: 'facility-report-setup', accountGuid: 'account-a', facilityGuid: 'facility-a', reportGuid: 'report-a' });
    expect(resolved.actionLabel).toBe('Review name');
    expect(resolved).toMatchObject({ id: item.id, severity: item.severity, evidence: item.evidence, todo: item.todo });
    expect(statusFindingEvidenceSignature(resolved)).toBe(statusFindingEvidenceSignature(item));
    expect(snapshot).toEqual(before);
  });
  it('labels partially implemented findings precisely and leaves dates, data and facility selectors pending', () => {
    const snapshot = accountReportSnapshot();
    const mixed = resolveReportStatusItem(finding('account', 'report.configuration.invalid', ['missingName', 'missingReportYear']), snapshot);
    expect(mixed.actionLabel).toBe('Review name'); expect(mixed.description).toContain('Other report settings are pending migration.');
    expect(resolveReportStatusItem(mixed, snapshot)).toEqual(mixed);
    for (const [scope, code, reasons] of [
      ['account', 'report.configuration.invalid', ['missingReportYear']],
      ['facility', 'report.configuration.invalid', ['missingStartDate']],
      ['account', 'report.dates.invalid', []], ['facility', 'report.data.incomplete', []],
      ['facility', 'report.analysis.invalid', []]
    ] as const) {
      const resolved = resolveReportStatusItem(finding(scope, code, [...reasons]), snapshot);
      expect(resolved.destination.kind).toBe('unavailable'); expect(resolved.unavailableReason).toContain('pending migration');
    }
  });
  it.each(ACCOUNT_REPORT_TYPES)('opens existing common setup for $value and only applicable account analysis selectors', ({ value }) => {
    const snapshot = accountReportSnapshot(); snapshot.accountReports[0].reportType = value;
    expect(resolveReportStatusItem(finding('account'), snapshot).destination.kind).toBe('account-report-setup');
    expect(resolveReportStatusItem(finding('account', 'report.analysis.invalid'), snapshot).destination.kind)
      .toBe(accountReportAnalysisSetupKey(value) ? 'account-report-setup' : 'unavailable');
  });
  it.each(FACILITY_REPORT_TYPES)('opens existing common setup for facility $value', ({ value }) => {
    const snapshot = accountReportSnapshot(); snapshot.facilityReports = [reportFixture({ facilityReportType: value })];
    expect(resolveReportStatusItem(finding('facility'), snapshot).destination.kind).toBe('facility-report-setup');
  });
  it.each(['account', 'facility'] as const)('rejects missing and foreign ownership for %s reports, including equal GUIDs across scopes', scope => {
    const original = accountReportSnapshot();
    const item = { ...finding(scope), entity: { ...finding(scope).entity, guid: 'same' } };
    original.accountReports[0].guid = 'same'; original.facilityReports = [reportFixture({ guid: 'same' })];
    const owned = resolveReportStatusItem(item, original);
    expect(owned.destination.kind).toBe(scope === 'account' ? 'account-report-setup' : 'facility-report-setup');
    const variants: AccountWorkspaceSnapshot[] = [
      { ...original, account: { ...original.account, guid: 'other-account' } },
      scope === 'account' ? { ...original, accountReports: [] } : { ...original, facilityReports: [] },
      scope === 'account' ? { ...original, accountReports: [{ ...original.accountReports[0], accountId: 'other-account' }] }
        : { ...original, facilityReports: [{ ...original.facilityReports[0], accountId: 'other-account' }] }
    ];
    if (scope === 'facility') variants.push({ ...original, facilities: [] }, { ...original, facilities: [{ ...original.facilities[0], accountId: 'other-account' }] },
      { ...original, facilityReports: [{ ...original.facilityReports[0], facilityId: 'other-facility' }] });
    for (const snapshot of variants) expect(resolveReportStatusItem(item, snapshot).destination.kind).toBe('unavailable');
    expect(resolveReportStatusItem(item, undefined).destination.kind).toBe('unavailable');
  });
  it('suppresses unsupported types and reports hidden by Other Impacts', () => {
    const snapshot = accountReportSnapshot();
    snapshot.accountReports[0].reportType = 'unknown' as never;
    expect(resolveReportStatusItem(finding('account'), snapshot).destination.kind).toBe('unavailable');
    snapshot.facilityReports = [reportFixture({ facilityReportType: 'unknown' as never })];
    expect(resolveReportStatusItem(finding('facility'), snapshot).destination.kind).toBe('unavailable');
    snapshot.account.displayEmissions = false;
    for (const reportType of ['betterClimate', 'accountEmissionFactors'] as const) {
      snapshot.accountReports[0].reportType = reportType;
      expect(resolveReportStatusItem(finding('account'), snapshot).unavailableReason).toContain('Other Impacts');
    }
    snapshot.facilityReports = [reportFixture({ facilityReportType: 'emissionFactors' })];
    expect(resolveReportStatusItem(finding('facility'), snapshot).unavailableReason).toContain('Other Impacts');
  });
  it('uses only the active account report reference and the facility report’s explicit owner for analysis warnings', () => {
    const snapshot = accountReportSnapshot(); snapshot.accountReports[0].performanceReportSetup.analysisItemId = 'inactive-reference';
    snapshot.facilityReports = [reportFixture({ analysisItemId: 'facility-analysis' })];
    expect(resolveReportStatusItem(finding('account', 'report.analysis.warning'), snapshot).destination)
      .toEqual({ kind: 'account-analysis', accountGuid: 'account-a', analysisGuid: 'account-analysis' });
    expect(resolveReportStatusItem(finding('facility', 'report.analysis.warning'), snapshot).destination)
      .toEqual({ kind: 'facility-analysis', facilityGuid: 'facility-a', analysisGuid: 'facility-analysis', scope: 'analysis', tab: 'setup' });
    snapshot.accountReports[0].analysisReportSetup.analysisItemId = 'missing';
    snapshot.facilityReports = [reportFixture({ analysisItemId: 'missing' })];
    for (const scope of ['account', 'facility'] as const) expect(resolveReportStatusItem(finding(scope, 'report.analysis.warning'), snapshot).destination.kind).toBe('unavailable');
  });
  it('resolves a saved hidden pair without refreshing its metadata or choosing a different pair', () => {
    const snapshot = accountReportSnapshot(true); snapshot.accountAnalyses[0].name = 'Stale name';
    const before = structuredClone(snapshot);
    expect(resolveReportStatusItem(finding('account', 'report.analysis.warning'), snapshot).destination)
      .toEqual({ kind: 'facility-analysis', facilityGuid: 'facility-a', analysisGuid: 'facility-analysis', scope: 'analysis', tab: 'setup' });
    expect(snapshot).toEqual(before);
    snapshot.accountReports[0].analysisReportSetup.analysisItemId = 'missing';
    expect(resolveReportStatusItem(finding('account', 'report.analysis.warning'), snapshot).destination.kind).toBe('unavailable');
  });
  it('does not route warnings through foreign-owned account or facility analyses', () => {
    const snapshot = accountReportSnapshot();
    snapshot.accountAnalyses[0].accountId = 'foreign';
    snapshot.facilityAnalyses[0].accountId = 'foreign';
    snapshot.facilityReports = [reportFixture({ analysisItemId: 'facility-analysis' })];
    for (const scope of ['account', 'facility'] as const) expect(resolveReportStatusItem(finding(scope, 'report.analysis.warning'), snapshot).destination.kind).toBe('unavailable');
  });
  it.each(['missing', 'foreign-account', 'foreign-facility', 'unsupported', 'skip', 'multiple-links'] as const)('suppresses %s analysis destinations through saved pairs', invalid => {
    const snapshot = accountReportSnapshot(true);
    if (invalid === 'missing') snapshot.facilityAnalyses = [];
    if (invalid === 'foreign-account') snapshot.facilityAnalyses[0].accountId = 'other-account';
    if (invalid === 'foreign-facility') snapshot.facilityAnalyses[0].facilityId = 'other-facility';
    if (invalid === 'unsupported') snapshot.facilityAnalyses[0].analysisCategory = 'other' as never;
    if (invalid === 'skip') snapshot.accountAnalyses[0].facilityAnalysisItems[0].analysisItemId = 'skip';
    if (invalid === 'multiple-links') snapshot.accountAnalyses[0].facilityAnalysisItems.push({ facilityId: 'facility-a', analysisItemId: 'facility-analysis' });
    expect(resolveReportStatusItem(finding('account', 'report.analysis.warning'), snapshot).destination.kind).toBe('unavailable');
  });
});
