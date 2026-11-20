import { buildEmissionFactorsInput, calculateEmissionFactors } from '@domain/reports/emission-factors/emission-factors-report';
import { emissionFactorsRates, emissionFactorsSnapshot } from '@domain/reports/testing/emission-factors-fixtures';
import { EmissionFactorsReportSnapshot } from '@app/v1/reports/shared/emission-factors/emission-factors-report-snapshot';

export function emissionFactorsOutputSnapshot(): EmissionFactorsReportSnapshot {
  const snapshot = emissionFactorsSnapshot(), report = snapshot.facilityReports[0];
  return { identity: { scope: 'facility', accountGuid: report.accountId, facilityGuid: report.facilityId, reportGuid: report.guid },
    name: report.name, startYear: 2022, endYear: 2024,
    results: calculateEmissionFactors(buildEmissionFactorsInput(snapshot, report.facilityId, report.emissionFactorsReportSettings, emissionFactorsRates())) };
}
