import type { ReportType } from '@data/models/constantsAndTypes';
import type { FacilityReportType } from '@data/models/idbModels/facilityReport';
import { ACCOUNT_REPORT_TYPES } from './report-inventory.models';
import { FACILITY_REPORT_TYPES } from '@app/v1/facility/reports/facility-report.models';
import { reportIcon } from './report-icons';

describe('report icon selection', () => {
  it.each(ACCOUNT_REPORT_TYPES)('uses the custom icon or page fallback for account $value', ({ value }) => {
    expect(reportIcon({ reportType: value })).toBe(value === 'betterPlants' ? 'betterPlantsReport' : 'report');
  });
  it.each(FACILITY_REPORT_TYPES)('uses the page fallback for facility $value until its icon is added', ({ value }) => {
    expect(reportIcon({ facilityReportType: value })).toBe('report');
  });
  it.each(['unknown', '', 'toString', '__proto__'])('falls back for unrecognized saved report type %s', value => {
    expect(reportIcon({ reportType: value as ReportType })).toBe('report');
    expect(reportIcon({ facilityReportType: value as FacilityReportType })).toBe('report');
  });
  it('falls back when a report is unavailable', () => {
    expect(reportIcon()).toBe('report');
  });
});
