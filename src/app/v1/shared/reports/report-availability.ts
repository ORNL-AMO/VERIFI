import type { ReportType } from '@data/models/constantsAndTypes';
import type { FacilityReportType } from '@data/models/idbModels/facilityReport';

/** Other Impacts is stored as the account's existing displayEmissions preference. */
export function reportTypeAvailable(type: ReportType | FacilityReportType, displayEmissions: boolean | undefined): boolean {
  return !['emissionFactors', 'accountEmissionFactors', 'betterClimate'].includes(type) || displayEmissions === true;
}
