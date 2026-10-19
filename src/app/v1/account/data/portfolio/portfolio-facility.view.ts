import { IdbFacility } from '@data/models/idbModels/facility';
import { IconName } from '@app/v1/shared/icons/icon-registry';
import { StatusEvaluationState, StatusItem, isDataFinding, summarizeFindings } from '@app/v1/status/status.models';

export type FacilityStatusFilter = 'all' | 'attention' | 'error' | 'warning' | 'noMeters' | 'noReadings';
export type FacilitySort = 'attention' | 'facilityName' | 'modified';
export type FacilityTone = 'danger' | 'warning' | 'success' | 'neutral';
interface FacilityRecord { readonly facilityId: string; readonly modifiedDate?: Date | string; }

export interface PortfolioFacilityView {
  readonly facility: IdbFacility;
  readonly location: string;
  readonly searchText: string;
  readonly tone: FacilityTone;
  readonly icon: IconName;
  readonly statusLabel: string;
  readonly statusRank: number;
  readonly errorCount: number;
  readonly warningCount: number;
  readonly noMeters: boolean;
  readonly noReadings: boolean;
  readonly modified: number;
}

export interface PortfolioFacilityInput {
  readonly facilities: readonly IdbFacility[];
  readonly meters: readonly FacilityRecord[];
  readonly meterData: readonly FacilityRecord[];
  readonly predictors: readonly FacilityRecord[];
  readonly predictorData: readonly FacilityRecord[];
  readonly equipment: readonly FacilityRecord[];
  readonly findings: readonly StatusItem[];
  readonly statusState: StatusEvaluationState;
}

export function buildPortfolioFacilities(input: PortfolioFacilityInput): PortfolioFacilityView[] {
  const modifiedByFacility = new Map<string, number>();
  for (const group of [input.meters, input.meterData, input.predictors, input.predictorData, input.equipment]) {
    for (const record of group) {
      const modified = new Date(record.modifiedDate || 0).getTime();
      if (Number.isFinite(modified) && modified > (modifiedByFacility.get(record.facilityId) || 0)) modifiedByFacility.set(record.facilityId, modified);
    }
  }
  const metered = new Set(input.meters.map(record => record.facilityId));
  const withReadings = new Set(input.meterData.map(record => record.facilityId));
  const findingsByFacility = new Map<string, StatusItem[]>();
  if (input.statusState === 'ready') {
    for (const finding of input.findings) {
      if (!isDataFinding(finding)) continue;
      const guid = finding.entity.facilityGuid || (finding.entity.kind === 'facility' ? finding.entity.guid : undefined);
      if (!guid) continue;
      const findings = findingsByFacility.get(guid) || [];
      findings.push(finding);
      findingsByFacility.set(guid, findings);
    }
  }
  return input.facilities.map(facility => {
    const findings = findingsByFacility.get(facility.guid) || [];
    const { errorCount, warningCount } = summarizeFindings(findings);
    const evaluated = input.statusState === 'ready';
    const tone: FacilityTone = !evaluated ? 'neutral' : errorCount ? 'danger' : warningCount ? 'warning' : 'success';
    const location = [facility.city, facility.state, facility.country === 'US' ? undefined : facility.country].filter(Boolean).join(', ');
    const facilityModified = new Date(facility.modifiedDate || 0).getTime();
    return {
      facility, location, tone,
      searchText: [facility.name, facility.city, facility.state, facility.country, facility.zip, facility.address, facility.classification].filter(Boolean).join(' ').toLowerCase(),
      icon: !evaluated ? input.statusState === 'error' ? 'info' : 'loading' : errorCount ? 'danger' : warningCount ? 'warning' : 'success',
      statusLabel: !evaluated ? input.statusState === 'error' ? 'Checks unavailable' : 'Checks pending'
        : errorCount ? 'Has errors' : warningCount ? 'Has warnings' : 'All data valid',
      statusRank: !evaluated ? 2 : errorCount ? 0 : warningCount ? 1 : 3,
      errorCount, warningCount,
      noMeters: !metered.has(facility.guid),
      noReadings: metered.has(facility.guid) && !withReadings.has(facility.guid),
      modified: Math.max(Number.isFinite(facilityModified) ? facilityModified : 0, modifiedByFacility.get(facility.guid) || 0)
    };
  });
}

export function filterPortfolioFacilities(facilities: readonly PortfolioFacilityView[], search: string, status: FacilityStatusFilter, sort: FacilitySort): PortfolioFacilityView[] {
  const query = search.trim().toLowerCase();
  return facilities.filter(view => !query || view.searchText.includes(query)).filter(view => {
    switch (status) {
      case 'attention': return view.errorCount + view.warningCount > 0;
      case 'error': return view.errorCount > 0;
      case 'warning': return view.warningCount > 0;
      case 'noMeters': return view.noMeters;
      case 'noReadings': return view.noReadings;
      default: return true;
    }
  }).sort((a, b) => (sort === 'attention' ? a.statusRank - b.statusRank : sort === 'modified' ? b.modified - a.modified : 0)
    || a.facility.name.localeCompare(b.facility.name) || a.facility.guid.localeCompare(b.facility.guid));
}
