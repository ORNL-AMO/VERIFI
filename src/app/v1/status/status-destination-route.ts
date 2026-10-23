import { StatusDestination } from './status.models';

/** Shared by status navigation and inventory link projections; no workspace selection side effects. */
export function statusDestinationRoute(destination: StatusDestination): readonly string[] | undefined {
  switch (destination.kind) {
    case 'account-settings': return ['/v1', 'workspace', 'account', destination.accountGuid, 'settings', destination.detail];
    case 'facility-data': return ['/v1', 'workspace', 'facility', destination.facilityGuid, 'data', destination.detail];
    case 'meter-tab': return ['/v1', 'workspace', 'facility', destination.facilityGuid, 'data', 'meters', destination.meterGuid, destination.tab];
    case 'predictor-tab': return ['/v1', 'workspace', 'facility', destination.facilityGuid, 'data', 'predictors', destination.predictorGuid, destination.tab];
    case 'account-report-setup': return ['/v1', 'workspace', 'account', destination.accountGuid, 'reports', 'workbench', destination.reportGuid, 'setup'];
    case 'facility-report-setup': return ['/v1', 'workspace', 'facility', destination.facilityGuid, 'reports', 'workbench', destination.reportGuid, 'setup'];
    case 'facility-analysis': return destination.scope === 'group' && destination.groupGuid
      ? ['/v1', 'workspace', 'facility', destination.facilityGuid, 'analysis', 'workbench', destination.analysisGuid, 'group', destination.groupGuid, destination.tab]
      : ['/v1', 'workspace', 'facility', destination.facilityGuid, 'analysis', 'workbench', destination.analysisGuid, destination.tab];
    case 'account-analysis': return ['/v1', 'workspace', 'account', destination.accountGuid, 'analysis', 'workbench', destination.analysisGuid, 'setup'];
    case 'unavailable': return undefined;
  }
}
