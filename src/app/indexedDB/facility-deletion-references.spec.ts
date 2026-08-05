import { IdbAccountAnalysisItem } from '../models/idbModels/accountAnalysisItem';
import { IdbAccountReport } from '../models/idbModels/accountReport';
import {
  FACILITY_DELETION_PARTICIPANT_STORES,
  FACILITY_ROOT_STORE
} from './facility-deletion.config';
import {
  removeFacilityFromAccountAnalysis,
  removeFacilityFromAccountReport
} from './facility-deletion-references';

describe('facility deletion configuration and reference cleanup', () => {
  const modifiedDate = new Date('2026-08-04T12:00:00.000Z');

  it('declares a fixed participant list without duplicate stores', () => {
    expect(new Set(FACILITY_DELETION_PARTICIPANT_STORES).size)
      .toBe(FACILITY_DELETION_PARTICIPANT_STORES.length);
    expect(FACILITY_DELETION_PARTICIPANT_STORES).toContain(FACILITY_ROOT_STORE);
    expect(FACILITY_DELETION_PARTICIPANT_STORES).toContain('accountReports');
    expect(FACILITY_DELETION_PARTICIPANT_STORES).toContain('accountAnalysisItems');
  });

  it('immutably removes facility references while preserving unknown report fields', () => {
    const report = {
      id: 10,
      guid: 'report-a',
      accountId: 'account-a',
      modifiedDate: new Date('2025-01-01T00:00:00.000Z'),
      unknownBackupField: { retained: true },
      dataOverviewReportSetup: {
        customOverviewField: 'retained',
        includedFacilities: [
          { facilityId: 'facility-a', included: true, includedGroups: [] },
          { facilityId: 'facility-b', included: true, includedGroups: [] }
        ]
      },
      betterClimateReportSetup: {
        customClimateField: 'retained',
        includedFacilityGroups: [
          { facilityId: 'facility-a', include: true, groups: [] },
          { facilityId: 'facility-b', include: true, groups: [] }
        ]
      }
    } as unknown as IdbAccountReport & { unknownBackupField: { retained: boolean } };

    const updated = removeFacilityFromAccountReport(report, 'facility-a', modifiedDate);

    expect(updated).not.toBe(report);
    expect(updated.dataOverviewReportSetup).not.toBe(report.dataOverviewReportSetup);
    expect(updated.betterClimateReportSetup).not.toBe(report.betterClimateReportSetup);
    expect(updated.dataOverviewReportSetup.includedFacilities.map(item => item.facilityId))
      .toEqual(['facility-b']);
    expect(updated.betterClimateReportSetup.includedFacilityGroups.map(item => item.facilityId))
      .toEqual(['facility-b']);
    expect((updated.dataOverviewReportSetup as any).customOverviewField).toBe('retained');
    expect((updated.betterClimateReportSetup as any).customClimateField).toBe('retained');
    expect(updated.unknownBackupField).toEqual({ retained: true });
    expect(updated.modifiedDate).toBe(modifiedDate);
    expect(report.dataOverviewReportSetup.includedFacilities).toHaveLength(2);
    expect(report.betterClimateReportSetup.includedFacilityGroups).toHaveLength(2);
  });

  it('tolerates missing legacy report sections and analysis facility selections', () => {
    const legacyReport = {
      id: 11,
      guid: 'legacy-report',
      accountId: 'account-a',
      legacyOnly: true
    } as unknown as IdbAccountReport;
    const legacyAnalysis = {
      id: 12,
      guid: 'legacy-analysis',
      accountId: 'account-a',
      legacyOnly: true
    } as unknown as IdbAccountAnalysisItem;

    expect(removeFacilityFromAccountReport(legacyReport, 'facility-a', modifiedDate))
      .toEqual({ ...legacyReport, modifiedDate });
    expect(removeFacilityFromAccountAnalysis(legacyAnalysis, 'facility-a', modifiedDate))
      .toEqual({ ...legacyAnalysis, modifiedDate });
  });

  it('immutably removes only the deleted facility from account analyses', () => {
    const analysis = {
      id: 12,
      guid: 'analysis-a',
      accountId: 'account-a',
      unknownBackupField: 'retained',
      facilityAnalysisItems: [
        { facilityId: 'facility-a', analysisItemId: 'analysis-facility-a' },
        { facilityId: 'facility-b', analysisItemId: 'analysis-facility-b' }
      ]
    } as unknown as IdbAccountAnalysisItem;

    const updated = removeFacilityFromAccountAnalysis(analysis, 'facility-a', modifiedDate);

    expect(updated).not.toBe(analysis);
    expect(updated.facilityAnalysisItems).toEqual([
      { facilityId: 'facility-b', analysisItemId: 'analysis-facility-b' }
    ]);
    expect((updated as any).unknownBackupField).toBe('retained');
    expect(analysis.facilityAnalysisItems).toHaveLength(2);
  });
});
