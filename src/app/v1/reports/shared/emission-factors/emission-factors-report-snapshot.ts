import { FacilityEmissionFactorsResult } from '@domain/reports/emission-factors/emission-factors-report';

/** Cloneable ready results shared by the facility output adapter and future account composition. */
export interface EmissionFactorsReportSnapshot {
  readonly identity: { readonly scope: 'facility'; readonly accountGuid: string; readonly facilityGuid: string; readonly reportGuid: string };
  readonly name: string;
  readonly startYear: number;
  readonly endYear: number;
  readonly results: FacilityEmissionFactorsResult;
}

export function emissionFactorsHaveContent(result: FacilityEmissionFactorsResult): boolean {
  return result.electricity.length > 0 || result.other.length > 0;
}
