import { FacilityEmissionFactorsResult } from '@domain/reports/emission-factors/emission-factors-report';

/** Detached ready results captured by the facility output adapter. */
export interface EmissionFactorsReportSnapshot {
  readonly identity: { readonly scope: 'facility'; readonly accountGuid: string; readonly facilityGuid: string; readonly reportGuid: string };
  readonly name: string;
  readonly startYear: number;
  readonly endYear: number;
  readonly results: FacilityEmissionFactorsResult;
}

export interface AccountEmissionFactorsReportSnapshot {
  readonly identity: { readonly scope: 'account'; readonly accountGuid: string; readonly reportGuid: string };
  readonly accountName: string;
  readonly name: string;
  readonly startYear: number;
  readonly endYear: number;
  readonly results: readonly FacilityEmissionFactorsResult[];
}

export function emissionFactorsHaveContent(result: FacilityEmissionFactorsResult): boolean {
  return result.electricity.length > 0 || result.other.length > 0;
}
