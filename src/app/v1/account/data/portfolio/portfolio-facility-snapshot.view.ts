import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { StatusItem, isDataFinding } from '@app/v1/status/status.models';
import { PortfolioFacilityInput } from './portfolio-facility.view';
import { PortfolioFacilitySnapshot, PortfolioFindingPreview, PortfolioResourceSummary, PortfolioTileLink } from './portfolio-inventory.models';

export type FacilitySnapshotNavigation = Pick<WorkspaceNavigationService, 'facilityDataRoute' | 'facilityMeterRoute' | 'facilityPredictorRoute'>;

/** Counts resources once at their highest active severity; finding counts remain separate. */
export function buildFacilitySnapshots(input: PortfolioFacilityInput, navigation: FacilitySnapshotNavigation): ReadonlyMap<string, PortfolioFacilitySnapshot> {
  const byFacility = <T extends { readonly facilityId: string }>(records: readonly T[]) => {
    const grouped = new Map<string, T[]>();
    for (const record of records) {
      const group = grouped.get(record.facilityId) ?? [];
      group.push(record); grouped.set(record.facilityId, group);
    }
    return grouped;
  };
  const meters = byFacility(input.meters), predictors = byFacility(input.predictors);
  const findings = new Map<string, StatusItem[]>();
  if (input.statusState === 'ready') for (const finding of input.findings) {
    if (!isDataFinding(finding)) continue;
    const facilityGuid = finding.entity.facilityGuid ?? (finding.entity.kind === 'facility' ? finding.entity.guid : undefined);
    if (!facilityGuid) continue;
    const group = findings.get(facilityGuid) ?? [];
    group.push(finding); findings.set(facilityGuid, group);
  }
  return new Map(input.facilities.map(facility => {
    const active = findings.get(facility.guid) ?? [];
    const resources: PortfolioResourceSummary[] = (['meters', 'predictors'] as const).map(kind => {
      const records = (kind === 'meters' ? meters : predictors).get(facility.guid) ?? [];
      const severity = new Map<string, 'error' | 'warning'>();
      for (const finding of active) {
        if (finding.entity.kind !== (kind === 'meters' ? 'meter' : 'predictor')) continue;
        if (finding.severity === 'error') severity.set(finding.entity.guid, 'error');
        else if (finding.severity === 'warning' && !severity.has(finding.entity.guid)) severity.set(finding.entity.guid, 'warning');
      }
      const ids = [...new Set(records.map(record => record.guid))];
      const errorCount = ids.filter(guid => severity.get(guid) === 'error').length;
      const warningCount = ids.filter(guid => severity.get(guid) === 'warning').length;
      return {
        kind, label: kind === 'meters' ? 'Meters' : 'Predictors', icon: kind === 'meters' ? 'meter' : 'predictor',
        route: navigation.facilityDataRoute(facility.guid, kind), total: ids.length, errorCount, warningCount,
        validCount: input.statusState === 'ready' ? ids.length - errorCount - warningCount : 0
      };
    });
    const issues = active.filter((finding): finding is StatusItem & { severity: 'error' | 'warning' } => finding.severity !== 'information')
      .sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1)
        || a.entity.name.localeCompare(b.entity.name) || a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
    const previews: PortfolioFindingPreview[] = [];
    const seen = new Set<string>();
    for (const finding of issues) {
      const key = `${finding.entity.kind}:${finding.entity.guid}`;
      if (seen.has(key)) continue;
      seen.add(key);
      previews.push({ id: finding.id, name: finding.entity.kind === 'facility' ? 'Facility setup' : finding.entity.name,
        title: finding.title, description: finding.description, severity: finding.severity,
        action: findingAction(finding, navigation) });
      if (previews.length === 2) break;
    }
    const address = facility.address?.trim();
    const zip = facility.zip?.trim();
    const locality = [facility.city?.trim(), facility.state?.trim()].filter(Boolean).join(', ');
    const country = facility.country !== 'US' ? facility.country?.trim() : undefined;
    const fullAddress = [address, locality, zip && !address ? `ZIP / postal code ${zip}` : zip, country].filter(Boolean).join(', ');
    return [facility.guid, {
      evaluation: input.statusState, resources, findings: previews, remainingFindings: issues.length - previews.length,
      address: fullAddress || 'Address not set'
    }];
  }));
}

function findingAction(finding: StatusItem, navigation: FacilitySnapshotNavigation): PortfolioTileLink | undefined {
  const destination = finding.destination;
  switch (destination.kind) {
    case 'meter-tab': return { label: destination.tab === 'quality' ? 'Review quality' : destination.tab === 'settings' ? 'Open settings' : 'Review readings',
      route: navigation.facilityMeterRoute(destination.facilityGuid, destination.meterGuid, destination.tab) };
    case 'predictor-tab': return { label: destination.tab === 'quality' ? 'Review quality' : destination.tab === 'settings' ? 'Open settings' : 'Review readings',
      route: navigation.facilityPredictorRoute(destination.facilityGuid, destination.predictorGuid, destination.tab) };
    case 'facility-data': return { label: destination.detail === 'meter-grouping' ? 'Open meter grouping' : destination.detail === 'predictors' ? 'Open predictors' : 'Open meters',
      route: navigation.facilityDataRoute(destination.facilityGuid, destination.detail) };
    default: return undefined;
  }
}
